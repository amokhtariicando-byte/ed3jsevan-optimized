<?php
/**
 * Admin photo uploads (POST /api/admin/upload, multipart {file, slot}).
 *
 * Rules: MIME must be image/webp, image/png or image/jpeg (checked with
 * finfo on the actual bytes, never the client-supplied type); max 5 MB;
 * stored under a unique filename — sha256(content) + timestamp + a random
 * suffix + the MIME-derived extension — so a re-upload never overwrites an
 * older photo and browsers can cache by URL forever.
 *
 * Cutouts must be uploaded PRE-CUT with a transparent background
 * (PNG/WebP); background removal is NOT part of this backend.
 */

declare(strict_types=1);

namespace Eyvan;

/** Upload failure with the HTTP status the API should answer with. */
final class UploadException extends \RuntimeException
{
    public function __construct(
        public readonly int $status,
        public readonly string $errorCode,
        string $message,
    ) {
        parent::__construct($message);
    }
}

final class Uploads
{
    public const SLOTS = ['image', 'frontImage', 'cutoutImage'];

    /** MIME type → file extension. */
    private const MIME_EXTENSIONS = [
        'image/webp' => 'webp',
        'image/png' => 'png',
        'image/jpeg' => 'jpg',
    ];

    public function __construct(
        private string $uploadsDir,
        private string $uploadsUrl,
    ) {}

    /**
     * Validate + store one uploaded file. Returns the public URL.
     *
     * @param array $file One $_FILES entry.
     * @throws UploadException on any bad input.
     */
    public function handle(array $file, string $slot): string
    {
        if (!in_array($slot, self::SLOTS, true)) {
            throw new UploadException(400, 'validation_error', 'اسلات عکس نامعتبر است.');
        }
        $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($error !== UPLOAD_ERR_OK) {
            throw new UploadException(400, 'validation_error', self::errorMessage($error));
        }
        $tmpPath = (string) ($file['tmp_name'] ?? '');
        if ($tmpPath === '' || !is_uploaded_file($tmpPath)) {
            throw new UploadException(400, 'validation_error', 'فایلی آپلود نشده است.');
        }
        $size = (int) ($file['size'] ?? 0);
        if ($size > MAX_UPLOAD_BYTES) {
            throw new UploadException(413, 'payload_too_large', 'حجم فایل بیشتر از ۵ مگابایت است.');
        }
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($tmpPath);
        if (!is_string($mime) || !isset(self::MIME_EXTENSIONS[$mime])) {
            throw new UploadException(415, 'unsupported_media_type', 'فرمت عکس باید WebP ،PNG یا JPEG باشد.');
        }
        $ext = self::MIME_EXTENSIONS[$mime];
        $hash = hash_file('sha256', $tmpPath);
        if ($hash === false) {
            throw new \RuntimeException('Failed to hash uploaded file.');
        }
        // sha256(content) + timestamp + random suffix: unique even when the
        // same photo is uploaded twice within the same second.
        $filename = $hash . '-' . time() . '-' . bin2hex(random_bytes(4)) . '.' . $ext;

        if (!is_dir($this->uploadsDir) && !mkdir($this->uploadsDir, 0755, true) && !is_dir($this->uploadsDir)) {
            throw new \RuntimeException('Cannot create uploads directory: ' . $this->uploadsDir);
        }
        $dest = rtrim($this->uploadsDir, '/') . '/' . $filename;
        if (!move_uploaded_file($tmpPath, $dest)) {
            throw new \RuntimeException('Failed to store uploaded file.');
        }
        return rtrim($this->uploadsUrl, '/') . '/' . $filename;
    }

    private static function errorMessage(int $code): string
    {
        return match ($code) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'حجم فایل بیشتر از حد مجاز است.',
            UPLOAD_ERR_PARTIAL => 'فایل ناقص آپلود شد؛ دوباره تلاش کنید.',
            UPLOAD_ERR_NO_FILE => 'فایلی انتخاب نشده است.',
            default => 'آپلود فایل ناموفق بود.',
        };
    }
}
