<?php
/**
 * Draft/published snapshot CRUD. Every mutation loads the draft snapshot
 * JSON, mutates it in PHP, and saves it back — mirroring the mock store
 * (src/admin/api.ts) exactly, including its create defaults, the featured
 * rule (slice to 3, keep only existing items), and delete semantics.
 */

declare(strict_types=1);

namespace Eyvan;

/** Thrown when a PATCH target does not exist (HTTP 404). */
final class NotFoundException extends \RuntimeException {}

/** Thrown when a category still has items (HTTP 409). */
final class ConflictException extends \RuntimeException {}

final class MenuStore
{
    public function __construct(private Database $db) {}

    public function getDraft(): array
    {
        return Database::decode($this->requireSnapshotJson('draft'));
    }

    public function getPublished(): array
    {
        return Database::decode($this->requireSnapshotJson('published'));
    }

    private function requireSnapshotJson(string $state): string
    {
        $json = $this->db->getSnapshotJson($state);
        if ($json === null) {
            throw new \RuntimeException("Missing '{$state}' snapshot.");
        }
        return $json;
    }

    private function saveDraft(array $state): void
    {
        $this->db->setSnapshotJson('draft', Database::encode($state));
    }

    public function getLastPublishedAt(): ?string
    {
        return $this->db->getMeta('lastPublishedAt');
    }

    /** hasDraft = draft JSON differs from published JSON (string compare). */
    public function getPublishState(): array
    {
        return [
            'hasDraft' => $this->requireSnapshotJson('draft') !== $this->requireSnapshotJson('published'),
            'lastPublishedAt' => $this->getLastPublishedAt(),
        ];
    }

    /** Copy draft → published in one transaction; stamp lastPublishedAt. */
    public function publish(): array
    {
        return $this->db->transaction(function (): array {
            $draftJson = $this->requireSnapshotJson('draft');
            $this->db->setSnapshotJson('published', $draftJson);
            $now = eyvan_now_iso();
            $this->db->setMeta('lastPublishedAt', $now);
            return ['hasDraft' => false, 'lastPublishedAt' => $now];
        });
    }

    /** Restore the draft from published and return it. */
    public function discardDraft(): array
    {
        $published = $this->getPublished();
        $this->saveDraft($published);
        return $published;
    }

    // ---- items ----

    public function updateItem(string $id, array $patch): array
    {
        $draft = $this->getDraft();
        foreach ($draft['items'] as &$item) {
            if (($item['id'] ?? null) === $id) {
                unset($patch['id']); // ids are immutable
                $item = array_merge($item, $patch);
                $this->saveDraft($draft);
                $updated = $item;
                unset($item);
                return $updated;
            }
        }
        unset($item);
        throw new NotFoundException('آیتم پیدا نشد.');
    }

    public function createItem(array $input): array
    {
        $draft = $this->getDraft();
        $siblings = 0;
        foreach ($draft['items'] as $existing) {
            if (($existing['categoryId'] ?? null) === $input['categoryId']) {
                $siblings++;
            }
        }
        // Defaults mirror MockAdminApi.createItem exactly. Keys the mock
        // leaves undefined (price, priceBlend50, priceArabica100, highlight)
        // are OMITTED here too, so the stored JSON matches the mock's.
        $item = [
            'id' => 'item-' . bin2hex(random_bytes(8)),
            'categoryId' => $input['categoryId'],
            'name' => $input['name'],
            'description' => $input['description'] ?? '',
        ];
        foreach (['price', 'priceBlend50', 'priceArabica100', 'highlight'] as $optional) {
            if (array_key_exists($optional, $input) && $input[$optional] !== null) {
                $item[$optional] = $input[$optional];
            }
        }
        $item['supportsSyrup'] = $input['supportsSyrup'] ?? false;
        $item['supportsMilkTemp'] = $input['supportsMilkTemp'] ?? false;
        $item['isHot'] = $input['isHot'] ?? false;
        $item['image'] = $input['image'] ?? '';
        $item['frontImage'] = $input['frontImage'] ?? '';
        $item['cutoutImage'] = $input['cutoutImage'] ?? '';
        $item['vesselType'] = $input['vesselType'] ?? 'cup';
        $item['prefersFrontView'] = $input['prefersFrontView'] ?? false;
        $item['plateAngle'] = $input['plateAngle'] ?? 0;
        $item['backdropTone'] = $input['backdropTone'] ?? 'olive';
        $item['available'] = $input['available'] ?? true;
        $item['sortOrder'] = $siblings;
        $draft['items'][] = $item;
        $this->saveDraft($draft);
        return $item;
    }

    public function deleteItem(string $id): void
    {
        $draft = $this->getDraft();
        // Mirror the mock: no 404 for a missing id (idempotent delete);
        // the id is also dropped from featured.
        $draft['items'] = array_values(array_filter(
            $draft['items'],
            static fn(array $i): bool => ($i['id'] ?? null) !== $id,
        ));
        $draft['featured'] = array_values(array_filter(
            $draft['featured'],
            static fn(string $f): bool => $f !== $id,
        ));
        $this->saveDraft($draft);
    }

    public function reorderItems(string $categoryId, array $orderedIds): void
    {
        $draft = $this->getDraft();
        $orderedIds = array_values(array_filter($orderedIds, 'is_string'));
        $order = array_flip($orderedIds);
        foreach ($draft['items'] as &$item) {
            if (($item['categoryId'] ?? null) === $categoryId && isset($order[$item['id']])) {
                $item['sortOrder'] = $order[$item['id']];
            }
        }
        unset($item);
        $this->saveDraft($draft);
    }

    // ---- categories ----

    public function updateCategory(string $id, array $patch): array
    {
        $draft = $this->getDraft();
        foreach ($draft['categories'] as &$category) {
            if (($category['id'] ?? null) === $id) {
                unset($patch['id']); // ids are immutable
                $category = array_merge($category, $patch);
                $this->saveDraft($draft);
                $updated = $category;
                unset($category);
                return $updated;
            }
        }
        unset($category);
        throw new NotFoundException('دسته پیدا نشد.');
    }

    public function createCategory(array $input): array
    {
        $draft = $this->getDraft();
        // Defaults mirror MockAdminApi.createCategory exactly; the key the
        // mock leaves undefined (comingSoonDescription) is omitted too.
        $category = [
            'id' => 'cat-' . bin2hex(random_bytes(8)),
            'name' => $input['name'],
            'shortName' => $input['shortName'],
            'subtitle' => $input['subtitle'] ?? '',
        ];
        if (array_key_exists('comingSoonDescription', $input) && $input['comingSoonDescription'] !== null) {
            $category['comingSoonDescription'] = $input['comingSoonDescription'];
        }
        $category['defaultTone'] = $input['defaultTone'] ?? 'olive';
        $category['comingSoon'] = $input['comingSoon'] ?? false;
        $category['isHotCategory'] = $input['isHotCategory'] ?? false;
        $category['sortOrder'] = count($draft['categories']);
        $draft['categories'][] = $category;
        $this->saveDraft($draft);
        return $category;
    }

    public function deleteCategory(string $id): void
    {
        $draft = $this->getDraft();
        foreach ($draft['items'] as $item) {
            if (($item['categoryId'] ?? null) === $id) {
                throw new ConflictException('این دسته آیتم دارد؛ اول آیتم‌هایش را جابه‌جا یا حذف کنید.');
            }
        }
        // Mirror the mock: no 404 for a missing id (idempotent delete).
        $draft['categories'] = array_values(array_filter(
            $draft['categories'],
            static fn(array $c): bool => ($c['id'] ?? null) !== $id,
        ));
        $this->saveDraft($draft);
    }

    public function reorderCategories(array $orderedIds): void
    {
        $draft = $this->getDraft();
        $orderedIds = array_values(array_filter($orderedIds, 'is_string'));
        $order = array_flip($orderedIds);
        foreach ($draft['categories'] as &$category) {
            if (isset($order[$category['id']])) {
                $category['sortOrder'] = $order[$category['id']];
            }
        }
        unset($category);
        $this->saveDraft($draft);
    }

    // ---- syrups / featured / cafe info / SEO ----

    /** Replace the whole syrup list. */
    public function updateSyrups(array $syrups): array
    {
        $draft = $this->getDraft();
        $draft['syrups'] = array_values($syrups);
        $this->saveDraft($draft);
        return $draft['syrups'];
    }

    /** Featured rule, mirroring the mock: first 3 ids, only existing items. */
    public function updateFeatured(array $ids): array
    {
        $draft = $this->getDraft();
        $existing = [];
        foreach ($draft['items'] as $item) {
            $existing[$item['id']] = true;
        }
        $valid = [];
        foreach (array_slice($ids, 0, 3) as $id) {
            if (is_string($id) && isset($existing[$id])) {
                $valid[] = $id;
            }
        }
        $draft['featured'] = $valid;
        $this->saveDraft($draft);
        return $valid;
    }

    public function updateCafeInfo(array $patch): array
    {
        $draft = $this->getDraft();
        $draft['cafeInfo'] = array_merge($draft['cafeInfo'], $patch);
        $this->saveDraft($draft);
        return $draft['cafeInfo'];
    }

    public function updateSeo(array $seo): array
    {
        $draft = $this->getDraft();
        $draft['seo'] = [
            'title' => $seo['title'] ?? '',
            'description' => $seo['description'] ?? '',
        ];
        $this->saveDraft($draft);
        return $draft['seo'];
    }

    /** The JSON backup object (mirrors MockAdminApi.exportBackup). */
    public function exportBackup(): array
    {
        return [
            'version' => 1,
            'exportedAt' => eyvan_now_iso(),
            'draft' => $this->getDraft(),
            'published' => $this->getPublished(),
            'lastPublishedAt' => $this->getLastPublishedAt(),
        ];
    }
}
