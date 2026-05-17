@php
    $product = $product ?? [];
    $productOptions = $productOptions ?? [];
    $productMetadata = $productMetadata ?? [];
    $supplierOptions = $supplierOptions ?? [];
    $categoryOptions = $categoryOptions ?? [];
    $youtubeEmbedUrl = $youtubeEmbedUrl ?? null;
    $imagePreviewUrl = $imagePreviewUrl ?? null;
    $homeCardImagePreviewUrl = $homeCardImagePreviewUrl ?? null;
    $existingImageUrls = array_values(array_filter($product['image_urls'] ?? []));
    $fieldHasError = static fn (string $key): bool => $errors->has($key);
@endphp

<style>
    .pool-grid {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    }

    .pool-block {
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 1rem;
        margin-bottom: 1rem;
    }

    .pool-block h3 {
        margin: 0 0 1rem;
        font-size: 1rem;
        font-weight: 700;
    }

    .pool-field {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        margin-bottom: 1rem;
    }

    .pool-field label {
        font-weight: 600;
        color: #334155;
    }

    .pool-field input,
    .pool-field textarea,
    .pool-field select {
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        padding: 0.75rem 0.9rem;
        width: 100%;
        background: #fff;
    }

    .pool-field .pool-input-error {
        border-color: #ef4444;
        background: #fef2f2;
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
    }

    .pool-field input:invalid,
    .pool-field select:invalid,
    .pool-field textarea:invalid {
        border-color: #ef4444;
        background: #fef2f2;
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
    }

    .pool-field-error {
        margin-top: 0.35rem;
        color: #dc2626;
        font-size: 0.85rem;
        font-weight: 600;
    }

    .pool-field textarea {
        min-height: 110px;
        resize: vertical;
    }

    .product-richtext-source {
        display: none;
    }

    .product-description-field {
        margin-bottom: 0;
    }

    .product-richtext-shell {
        border: 1px solid #cbd5e1;
        border-radius: 14px;
        background: #fff;
        overflow: hidden;
    }

    .product-richtext-toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 0.55rem;
        align-items: center;
        padding: 0.85rem;
        border-bottom: 1px solid #e2e8f0;
        background: #f8fafc;
    }

    .product-richtext-toolbar button,
    .product-richtext-toolbar select {
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        background: #fff;
        padding: 0.55rem 0.8rem;
        color: #0f172a;
        font-size: 0.9rem;
        line-height: 1.2;
    }

    .product-richtext-toolbar button {
        cursor: pointer;
        font-weight: 600;
    }

    .product-richtext-toolbar button:hover,
    .product-richtext-toolbar select:hover {
        border-color: #93c5fd;
    }

    .product-richtext-toolbar-group {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        align-items: center;
    }

    .product-richtext-editor {
        min-height: 420px;
        padding: 1.1rem 1rem;
        color: #111827;
        line-height: 1.8;
        font-size: 1rem;
        outline: none;
        overflow-wrap: anywhere;
    }

    .product-richtext-editor:empty::before {
        content: attr(data-placeholder);
        color: #94a3b8;
    }

    .product-richtext-editor p,
    .product-richtext-editor div,
    .product-richtext-editor h1,
    .product-richtext-editor h2,
    .product-richtext-editor h3,
    .product-richtext-editor h4,
    .product-richtext-editor ul,
    .product-richtext-editor ol,
    .product-richtext-editor blockquote,
    .product-richtext-editor figure {
        margin: 0 0 1rem;
    }

    .product-richtext-editor ul,
    .product-richtext-editor ol {
        padding-left: 1.5rem;
    }

    .product-richtext-editor img {
        display: block;
        margin: 0 auto;
        width: auto;
        max-width: 100%;
        max-height: 900px;
        height: auto;
        object-fit: contain;
        border-radius: 12px;
        cursor: pointer;
    }

    .product-richtext-editor img.is-selected {
        outline: 3px solid #2563eb;
        outline-offset: 4px;
        box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.15);
    }

    .product-richtext-editor figure {
        text-align: center;
        position: relative;
    }

    .product-richtext-editor figcaption {
        margin-top: 0.6rem;
        color: #64748b;
        font-size: 0.92rem;
    }

    .product-richtext-editor .product-richtext-image-remove {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        border: 0;
        border-radius: 999px;
        width: 2rem;
        height: 2rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(15, 23, 42, 0.88);
        color: #fff;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 6px 20px rgba(15, 23, 42, 0.18);
        z-index: 2;
    }

    .product-richtext-editor .product-richtext-image-remove:hover {
        background: rgba(220, 38, 38, 0.95);
    }

    .product-richtext-preview {
        margin-top: 0.9rem;
        border: 1px solid #dbeafe;
        border-radius: 14px;
        background: #f8fbff;
        overflow: hidden;
    }

    .product-richtext-preview-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.85rem 1rem;
        border-bottom: 1px solid #dbeafe;
        color: #1e3a8a;
        font-weight: 700;
    }

    .product-richtext-preview-body {
        padding: 1rem;
        color: #0f172a;
        line-height: 1.8;
        background: #fff;
    }

    .product-richtext-preview-body p,
    .product-richtext-preview-body div,
    .product-richtext-preview-body h1,
    .product-richtext-preview-body h2,
    .product-richtext-preview-body h3,
    .product-richtext-preview-body h4,
    .product-richtext-preview-body ul,
    .product-richtext-preview-body ol,
    .product-richtext-preview-body blockquote,
    .product-richtext-preview-body figure {
        margin: 0 0 1rem;
    }

    .product-richtext-preview-body img {
        display: block;
        margin: 0 auto;
        width: auto;
        max-width: 100%;
        max-height: 900px;
        height: auto;
        object-fit: contain;
        border-radius: 12px;
    }

    .product-icon-picker-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.45);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 1.5rem;
    }

    .product-icon-picker-backdrop.is-open {
        display: flex;
    }

    .product-icon-picker-modal {
        width: min(760px, 100%);
        max-height: min(80vh, 760px);
        overflow: hidden;
        border-radius: 18px;
        background: #fff;
        box-shadow: 0 24px 80px rgba(15, 23, 42, 0.22);
        display: flex;
        flex-direction: column;
    }

    .product-icon-picker-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 1rem 1.1rem;
        border-bottom: 1px solid #e2e8f0;
    }

    .product-icon-picker-title {
        font-size: 1rem;
        font-weight: 700;
        color: #0f172a;
    }

    .product-icon-picker-close {
        border: 0;
        background: #e2e8f0;
        color: #0f172a;
        border-radius: 999px;
        width: 2rem;
        height: 2rem;
        cursor: pointer;
        font-weight: 700;
    }

    .product-icon-picker-search {
        padding: 1rem 1.1rem 0.9rem;
        border-bottom: 1px solid #f1f5f9;
    }

    .product-icon-picker-search input {
        width: 100%;
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        padding: 0.8rem 0.95rem;
    }

    .product-icon-picker-body {
        padding: 1rem 1.1rem 1.2rem;
        overflow: auto;
    }

    .product-icon-picker-category {
        margin-bottom: 1.1rem;
    }

    .product-icon-picker-category h4 {
        margin: 0 0 0.7rem;
        color: #334155;
        font-size: 0.95rem;
        font-weight: 700;
    }

    .product-icon-picker-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(52px, 1fr));
        gap: 0.6rem;
    }

    .product-icon-picker-option {
        border: 1px solid #dbeafe;
        border-radius: 14px;
        background: #fff;
        min-height: 52px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 1.45rem;
        cursor: pointer;
    }

    .product-icon-picker-option:hover {
        border-color: #60a5fa;
        background: #eff6ff;
    }

    .pool-note {
        margin-top: 0.35rem;
        font-size: 0.85rem;
        color: #64748b;
    }

    .product-media-shell {
        display: grid;
        gap: 1rem;
        grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
    }

    .product-media-preview {
        display: grid;
        gap: 0.85rem;
        align-content: start;
    }

    .product-media-card {
        border: 1px solid #dbeafe;
        border-radius: 14px;
        background: #f8fbff;
        padding: 0.9rem;
    }

    .product-media-card h4 {
        margin: 0 0 0.75rem;
        font-size: 0.95rem;
        font-weight: 700;
        color: #1e3a8a;
    }

    .product-media-youtube {
        position: relative;
        border-radius: 12px;
        overflow: hidden;
        background: #0f172a;
        aspect-ratio: 16 / 9;
    }

    .product-media-youtube iframe,
    .product-media-image img {
        width: 100%;
        height: 100%;
        border: 0;
    }

    .product-media-image {
        border-radius: 12px;
        overflow: hidden;
        background: #e2e8f0;
        min-height: 280px;
    }

    .product-media-image img {
        object-fit: contain;
        background: #fff;
    }

    .product-dropzone {
        border: 2px dashed #93c5fd;
        border-radius: 14px;
        padding: 1rem;
        text-align: center;
        background: #f8fbff;
        color: #1e40af;
        cursor: pointer;
        transition: border-color 0.2s ease, background 0.2s ease;
    }

    .product-dropzone.is-dragging {
        border-color: #2563eb;
        background: #eff6ff;
    }

    .product-dropzone strong {
        display: block;
        margin-bottom: 0.35rem;
        font-size: 1rem;
    }

    .product-toggle-grid {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    }

    .product-gallery-grid {
        display: grid;
        gap: 0.75rem;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }

    .product-gallery-preview-grid {
        display: grid;
        gap: 0.75rem;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        margin-top: 1rem;
    }

    .product-gallery-thumb {
        position: relative;
        border: 1px solid #dbeafe;
        border-radius: 12px;
        background: #f8fbff;
        overflow: hidden;
        aspect-ratio: 1 / 1;
        cursor: grab;
        transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
    }

    .product-gallery-thumb:active {
        cursor: grabbing;
    }

    .product-gallery-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }

    .product-gallery-thumb.is-dragging {
        opacity: 0.45;
        transform: scale(0.98);
    }

    .product-gallery-thumb.is-touch-dragging {
        opacity: 0.72;
        transform: scale(1.03);
        z-index: 3;
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
    }

    .product-gallery-thumb.is-drop-target {
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.16);
        transform: translateY(-2px);
    }

    .product-gallery-remove {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        width: 2rem;
        height: 2rem;
        border: 0;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.82);
        color: #fff;
        font-size: 1rem;
        font-weight: 700;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    }

    .product-gallery-remove:hover {
        background: rgba(220, 38, 38, 0.92);
    }

    .product-gallery-move {
        position: absolute;
        top: 0.5rem;
        left: 0.5rem;
        display: flex;
        gap: 0.35rem;
        z-index: 1;
    }

    .product-gallery-move button {
        width: 2rem;
        height: 2rem;
        border: 0;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.82);
        color: #fff;
        font-size: 0.95rem;
        font-weight: 700;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    }

    .product-gallery-move button:hover {
        background: rgba(37, 99, 235, 0.94);
    }

    .product-gallery-badge {
        position: absolute;
        left: 50%;
        bottom: 0.55rem;
        transform: translateX(-50%);
        padding: 0.3rem 0.55rem;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.78);
        color: #fff;
        font-size: 0.78rem;
        font-weight: 700;
        z-index: 1;
    }

    .product-pv-warning {
        margin-top: 0.5rem;
        padding: 0.75rem 0.9rem;
        border-radius: 10px;
        background: #fff7ed;
        border: 1px solid #fdba74;
        color: #9a3412;
        font-size: 0.9rem;
    }

    .product-dcw-warning {
        margin-top: 0.5rem;
        padding: 0.75rem 0.9rem;
        border-radius: 10px;
        background: #fefce8;
        border: 1px solid #facc15;
        color: #854d0e;
        font-size: 0.9rem;
    }

    .product-firm-warning {
        margin-top: 0.5rem;
        padding: 0.75rem 0.9rem;
        border-radius: 10px;
        background: #eff6ff;
        border: 1px solid #93c5fd;
        color: #1d4ed8;
        font-size: 0.9rem;
    }

    .product-firm-mode {
        margin-top: 0.75rem;
        padding: 0.85rem 1rem;
        border-radius: 12px;
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        color: #334155;
        font-size: 0.9rem;
    }

    .product-sales-mode-grid {
        display: grid;
        gap: 0.85rem;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }

    .product-sales-mode-card {
        display: block;
        border: 1px solid #cbd5e1;
        border-radius: 14px;
        background: #fff;
        padding: 1rem;
        cursor: pointer;
        transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
    }

    .product-sales-mode-card.is-active {
        border-color: #1d4ed8;
        background: #eff6ff;
        box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.12);
    }

    .product-sales-mode-card input {
        margin-right: 0.6rem;
    }

    .product-sales-mode-title {
        display: flex;
        align-items: center;
        color: #0f172a;
        font-weight: 700;
        margin-bottom: 0.45rem;
    }

    .product-sales-mode-detail {
        color: #475569;
        font-size: 0.9rem;
        line-height: 1.6;
    }

    .product-action-footer {
        position: sticky;
        bottom: 1rem;
        z-index: 5;
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        padding: 1rem;
        margin-top: 1.25rem;
        border: 1px solid #dbeafe;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.96);
        box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
        backdrop-filter: blur(12px);
    }

    .product-action-footer button {
        border: 0;
        border-radius: 12px;
        padding: 0.85rem 1.2rem;
        font-weight: 700;
        cursor: pointer;
    }

    .product-action-footer .secondary {
        background: #e2e8f0;
        color: #0f172a;
    }

    .product-action-footer .primary {
        background: #1d4ed8;
        color: #fff;
    }

    @media (max-width: 900px) {
        .product-media-shell {
            grid-template-columns: 1fr;
        }
    }
</style>

<div class="pool-block">
    <h3>SKU / Product detail</h3>

    <div class="pool-grid" style="display:none;">
        <div class="pool-field">
            <label for="product_supplier_id">Supplier</label>
            <select id="product_supplier_id" name="product[supplier_id]">
                <option value="">Select supplier</option>
                @foreach ($supplierOptions as $id => $label)
                    <option value="{{ $id }}" @selected((string) $id === (string) ($product['supplier_id'] ?? ''))>{{ $label }}</option>
                @endforeach
            </select>
        </div>

        <div class="pool-field">
            <label for="product_category_id">Category</label>
            <select id="product_category_id" name="product[category_id]">
                <option value="">Select category</option>
                @foreach ($categoryOptions as $id => $option)
                    <option value="{{ $id }}" @selected((string) $id === (string) ($product['category_id'] ?? ''))>{{ $option['label'] ?? '' }}</option>
                @endforeach
            </select>
        </div>

        <div class="pool-field">
            <label for="product_product_id">Product family</label>
            <select id="product_product_id" name="product[product_id]">
                <option value="">Select product family</option>
                @foreach ($productOptions as $id => $option)
                    <option
                        value="{{ $id }}"
                        data-supplier-id="{{ (int) ($option['supplier_id'] ?? 0) }}"
                        data-category-id="{{ (int) ($option['category_id'] ?? 0) }}"
                        @selected((string) $id === (string) ($product['product_id'] ?? ''))
                    >{{ $option['label'] ?? '' }}</option>
                @endforeach
            </select>
            <div class="pool-note">เลือก product family เดิมได้ หรือปล่อยว่างแล้วกรอก Product family code และ Product family name ด้านล่างเพื่อสร้าง family ใหม่</div>
        </div>

        <div class="pool-field">
            <label for="product_code">SKU</label>
            <input id="product_code" name="product[code]" value="{{ old('product.code', $product['code'] ?? '') }}" class="@if($fieldHasError('product.code')) pool-input-error @endif">
            @error('product.code')
                <div class="pool-field-error">{{ $message }}</div>
            @enderror
            <div class="pool-note" id="productCodeHint">ปล่อยว่างได้ ระบบจะ generate SKU ตอนกดบันทึกสำเร็จเท่านั้น เช่น `LON001` และยังแก้เองได้ถ้าต้องการ</div>
        </div>

        <div class="pool-field">
            <label for="product_name">SKU name</label>
            <input id="product_name" name="product[name]" value="{{ old('product.name', $product['name'] ?? '') }}" required>
        </div>

        <div class="pool-field">
            <label for="product_slug">Slug</label>
            <input id="product_slug" name="product[slug]" value="{{ old('product.slug', $product['slug'] ?? '') }}">
        </div>
    </div>

    <div class="pool-grid">
        <div class="pool-field">
            <label for="product_family_code">Product family code</label>
            <input id="product_family_code" name="product[product_family_code]" value="{{ old('product.product_family_code', $product['product_code'] ?? '') }}">
        </div>

        <div class="pool-field">
            <label for="product_family_name">Product family name</label>
            <input id="product_family_name" name="product[product_family_name]" value="{{ old('product.product_family_name', $product['product_name'] ?? '') }}">
        </div>

        <div class="pool-field">
            <label for="product_category_name">Category</label>
            <input id="product_category_name" value="{{ $product['category_name'] ?? '' }}" readonly>
        </div>

        <div class="pool-field">
            <label for="product_supplier_name">Supplier</label>
            <input id="product_supplier_name" value="{{ $product['supplier_name'] ?? '' }}" readonly>
        </div>
    </div>
</div>

<div class="pool-block">
    <h3>Media</h3>

    <div class="product-media-shell">
        <div>
            <div class="pool-field">
                <label for="product_youtube_url">YouTube URL</label>
                <input
                    id="product_youtube_url"
                    name="product[youtube_url]"
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value="{{ old('product.youtube_url', $product['youtube_url'] ?? '') }}"
                >
                <div class="pool-note">ถ้ามี YouTube ระบบจะแสดงวิดีโอไว้ก่อนและ autoplay ตอนเปิดหน้าสินค้าใน admin นี้</div>
            </div>

            <div class="product-dropzone" id="productDropzone" tabindex="0">
                <strong>Drop gallery images here</strong>
                <span>Click to choose, drag and drop, or paste images from clipboard. Gallery images are used only for Product Detail.</span>
            </div>

            <div class="pool-field">
                <label for="product_gallery_files">Gallery images</label>
                <input id="product_gallery_files" name="product[gallery_files][]" type="file" accept="image/*" multiple>
                <div id="product_existing_gallery_inputs"></div>
                <div class="pool-note">เลือกได้สูงสุด 10 รูป สำหรับหน้า Product Detail เท่านั้น รูปหลักหน้า Product Detail แนะนำ 1600 x 900 px (16:9) ระบบจะย่อรูปใหญ่ให้ไม่เกิน 1600px อัตโนมัติ และจะจัดการแสดงผลให้พอดีกับพื้นที่แสดงผลถ้ารูปเล็กหรือสัดส่วนไม่ตรง</div>
            </div>

            <div class="pool-field">
                <label for="product_home_card_file">Home card image</label>
                <input id="product_home_card_file" name="product[home_card_file]" type="file" accept="image/*">
                @error('product.home_card_file')
                    <div class="pool-field-error">{{ $message }}</div>
                @enderror
                <div class="pool-note">รูปนี้ใช้เฉพาะการ์ดสินค้าหน้า Home เท่านั้น ไม่กระทบลำดับรูปใน Product Detail ขนาดแนะนำ 1080 x 1080 px (1:1) ระบบจะย่อรูปใหญ่ให้ไม่เกิน 1600px อัตโนมัติ และจะจัดการแสดงผลให้อยู่กึ่งกลางกับพื้นที่แสดงผลถ้ารูปเล็กหรือสัดส่วนไม่ตรง</div>
            </div>
        </div>

        <div class="product-media-preview">
            <div class="product-media-card" id="productYoutubeCard" @if (!$youtubeEmbedUrl) style="display:none" @endif>
                <h4>YouTube preview</h4>
                <div class="product-media-youtube">
                    <iframe
                        id="productYoutubeFrame"
                        src="{{ $youtubeEmbedUrl ?? '' }}"
                        allow="autoplay; encrypted-media; picture-in-picture"
                        allowfullscreen
                    ></iframe>
                </div>
            </div>

            <div class="product-media-card">
                <h4>Image preview</h4>
                <div class="product-media-image">
                    <img
                        id="productImagePreview"
                        src="{{ $imagePreviewUrl ?: 'data:image/svg+xml;base64,' . base64_encode('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="100%" height="100%" fill="#e2e8f0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#475569" font-family="Arial" font-size="28">No Image</text></svg>') }}"
                        alt="Product image preview"
                    >
                </div>
                <div class="product-gallery-preview-grid" id="productGalleryPreview"></div>
            </div>

            <div class="product-media-card">
                <h4>Home card preview</h4>
                <div class="product-media-image" style="aspect-ratio: 1 / 1;">
                    <img
                        id="productHomeCardPreview"
                        src="{{ $homeCardImagePreviewUrl ?: 'data:image/svg+xml;base64,' . base64_encode('<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"640\" height=\"640\"><rect width=\"100%\" height=\"100%\" fill=\"#e2e8f0\"/><text x=\"50%\" y=\"50%\" dominant-baseline=\"middle\" text-anchor=\"middle\" fill=\"#475569\" font-family=\"Arial\" font-size=\"28\">No Home Image</text></svg>') }}"
                        alt="Home card image preview"
                        style="object-fit: contain; background: #f8fafc;"
                    >
                </div>
            </div>
        </div>
    </div>
</div>

<div class="pool-block">
    <h3>Descriptions</h3>

    <div class="pool-field">
        <label for="product_short_description">Short description</label>
        <textarea id="product_short_description" name="product[short_description]">{{ old('product.short_description', $product['short_description'] ?? '') }}</textarea>
    </div>

    <div class="pool-field">
        <label for="product_description">Description</label>
        <div class="product-description-field">
            <textarea
                id="product_description"
                name="product[description]"
                class="product-richtext-source"
            >{{ old('product.description', $product['description'] ?? '') }}</textarea>

            <div class="product-richtext-shell">
                <div class="product-richtext-toolbar" data-richtext-toolbar="product_description">
                    <div class="product-richtext-toolbar-group">
                        <button type="button" data-richtext-command="bold" data-editor-target="product_description"><strong>B</strong></button>
                        <button type="button" data-richtext-command="italic" data-editor-target="product_description"><em>I</em></button>
                        <button type="button" data-richtext-command="underline" data-editor-target="product_description"><u>U</u></button>
                    </div>

                    <div class="product-richtext-toolbar-group">
                        <button type="button" data-richtext-command="formatBlock" data-editor-target="product_description" data-command-value="p">Paragraph</button>
                        <button type="button" data-richtext-command="formatBlock" data-editor-target="product_description" data-command-value="h2">H2</button>
                        <button type="button" data-richtext-command="insertUnorderedList" data-editor-target="product_description">Bullet</button>
                        <button type="button" data-richtext-command="insertOrderedList" data-editor-target="product_description">Number</button>
                    </div>

                    <div class="product-richtext-toolbar-group">
                        <button type="button" data-richtext-command="justifyLeft" data-editor-target="product_description">Left</button>
                        <button type="button" data-richtext-command="justifyCenter" data-editor-target="product_description">Center</button>
                        <button type="button" data-richtext-command="justifyRight" data-editor-target="product_description">Right</button>
                    </div>

                    <div class="product-richtext-toolbar-group">
                        <select data-richtext-font-size data-editor-target="product_description">
                            <option value="">Font size</option>
                            <option value="14px">14px</option>
                            <option value="16px">16px</option>
                            <option value="18px">18px</option>
                            <option value="22px">22px</option>
                            <option value="28px">28px</option>
                            <option value="36px">36px</option>
                        </select>
                        <input type="color" value="#111827" data-richtext-color data-editor-target="product_description" title="Text color">
                        <button type="button" data-richtext-insert-icon data-editor-target="product_description">Insert icon</button>
                        <button type="button" data-richtext-insert-image data-editor-target="product_description">Insert image URL</button>
                        <button type="button" data-richtext-upload-image data-editor-target="product_description">Upload image</button>
                        <button type="button" data-richtext-remove-selected-image data-editor-target="product_description">Remove selected image</button>
                        <button type="button" data-richtext-remove-all-images data-editor-target="product_description">Remove all images</button>
                        <input type="file" accept="image/*" data-richtext-upload-input="product_description" style="display:none">
                        <button type="button" data-richtext-clear-format data-editor-target="product_description">Clear</button>
                    </div>
                    <div class="product-richtext-toolbar-group">
                        <button type="button" data-richtext-quick-icon="★" data-editor-target="product_description">★</button>
                        <button type="button" data-richtext-quick-icon="✓" data-editor-target="product_description">✓</button>
                        <button type="button" data-richtext-quick-icon="❤" data-editor-target="product_description">❤</button>
                        <button type="button" data-richtext-quick-icon="😊" data-editor-target="product_description">😊</button>
                        <button type="button" data-richtext-quick-icon="😍" data-editor-target="product_description">😍</button>
                        <button type="button" data-richtext-quick-icon="😁" data-editor-target="product_description">😁</button>
                        <button type="button" data-richtext-quick-icon="👍" data-editor-target="product_description">👍</button>
                        <button type="button" data-richtext-quick-icon="👌" data-editor-target="product_description">👌</button>
                        <button type="button" data-richtext-quick-icon="✨" data-editor-target="product_description">✨</button>
                        <button type="button" data-richtext-quick-icon="🔥" data-editor-target="product_description">🔥</button>
                        <button type="button" data-richtext-quick-icon="🌿" data-editor-target="product_description">🌿</button>
                        <button type="button" data-richtext-quick-icon="💚" data-editor-target="product_description">💚</button>
                        <button type="button" data-richtext-quick-icon="💙" data-editor-target="product_description">💙</button>
                        <button type="button" data-richtext-quick-icon="💛" data-editor-target="product_description">💛</button>
                        <button type="button" data-richtext-quick-icon="🎁" data-editor-target="product_description">🎁</button>
                        <button type="button" data-richtext-quick-icon="🎉" data-editor-target="product_description">🎉</button>
                        <button type="button" data-richtext-quick-icon="📣" data-editor-target="product_description">📣</button>
                        <button type="button" data-richtext-quick-icon="📌" data-editor-target="product_description">📌</button>
                        <button type="button" data-richtext-quick-icon="➡" data-editor-target="product_description">➡</button>
                        <button type="button" data-richtext-quick-icon="⭐" data-editor-target="product_description">⭐</button>
                        <button type="button" data-richtext-quick-icon="✅" data-editor-target="product_description">✅</button>
                        <button type="button" data-richtext-quick-icon="❗" data-editor-target="product_description">❗</button>
                        <button type="button" data-richtext-quick-icon="🛒" data-editor-target="product_description">🛒</button>
                        <button type="button" data-richtext-quick-icon="📦" data-editor-target="product_description">📦</button>
                        <button type="button" data-richtext-quick-icon="💯" data-editor-target="product_description">💯</button>
                        <button type="button" data-richtext-open-icon-picker data-editor-target="product_description">More icons</button>
                    </div>
                </div>

                <div
                    id="product_description_editor"
                    class="product-richtext-editor"
                    contenteditable="true"
                    data-richtext-editor="product_description"
                    data-placeholder="เพิ่มรายละเอียดสินค้า, ขยายตัวอักษร, จัดกึ่งกลาง, และแทรกรูปหรือไอคอนตรงกลางข้อความได้ที่นี่"
                ></div>
            </div>

            <div class="product-richtext-preview">
                <div class="product-richtext-preview-header">
                    <span>Preview</span>
                    <button type="button" data-richtext-refresh-preview="product_description">Refresh preview</button>
                </div>
                <div
                    id="product_description_preview"
                    class="product-richtext-preview-body"
                ></div>
            </div>
        </div>
        <div class="pool-note">ช่องนี้รองรับการจัดย่อหน้า, ปรับขนาดอักษร, จัดวางกึ่งกลาง, และแทรกรูปหรือไอคอนประกอบแบบกลางข้อความได้</div>
    </div>
</div>

<div class="product-icon-picker-backdrop" id="productIconPickerBackdrop" aria-hidden="true">
    <div class="product-icon-picker-modal" role="dialog" aria-modal="true" aria-labelledby="productIconPickerTitle">
        <div class="product-icon-picker-header">
            <div class="product-icon-picker-title" id="productIconPickerTitle">Choose icon</div>
            <button type="button" class="product-icon-picker-close" id="productIconPickerClose">×</button>
        </div>
        <div class="product-icon-picker-search">
            <input type="text" id="productIconPickerSearch" placeholder="Search icon category or emoji">
        </div>
        <div class="product-icon-picker-body" id="productIconPickerBody"></div>
    </div>
</div>

<div class="pool-block">
    <h3>Pricing</h3>

    <div class="pool-grid">
        <div class="pool-field" data-firm-hide="1">
            <label for="product_cost_price">Cost price</label>
            <input id="product_cost_price" name="product[cost_price]" type="number" step="0.00000001" min="0" value="{{ old('product.cost_price', $product['cost_price'] ?? '0') }}" class="@if($fieldHasError('product.cost_price')) pool-input-error @endif">
            @error('product.cost_price')
                <div class="pool-field-error">{{ $message }}</div>
            @enderror
        </div>

        <div class="pool-field" data-firm-hide="1">
            <label for="product_member_price" id="productMemberPriceLabel">Member price</label>
            <input id="product_member_price" name="product[member_price]" type="number" step="0.00000001" min="0" value="{{ old('product.member_price', $product['member_price'] ?? '0') }}" class="@if($fieldHasError('product.member_price')) pool-input-error @endif">
            @error('product.member_price')
                <div class="pool-field-error">{{ $message }}</div>
            @enderror
            <div class="pool-note" id="productMemberPriceNote">ราคาสมาชิกของ SKU นี้</div>
        </div>

        <div class="pool-field" data-firm-hide="1">
            <label for="product_retail_price">Retail price</label>
            <input id="product_retail_price" name="product[retail_price]" type="number" step="0.00000001" min="0" value="{{ old('product.retail_price', $product['retail_price'] ?? '0') }}" class="@if($fieldHasError('product.retail_price')) pool-input-error @endif">
            @error('product.retail_price')
                <div class="pool-field-error">{{ $message }}</div>
            @enderror
        </div>

        <div class="pool-field">
            <label for="product_pv">PV</label>
            <input id="product_pv" name="product[pv]" type="number" step="0.00000001" min="0" value="{{ old('product.pv', $product['pv'] ?? '0') }}" class="@if($fieldHasError('product.pv')) pool-input-error @endif">
            @error('product.pv')
                <div class="pool-field-error">{{ $message }}</div>
            @enderror
            <div class="pool-note">
                ค่าเริ่มต้นคำนวณจากสูตร `(ราคาสมาชิก - ต้นทุน) x 80%`
                ได้ <strong id="productPvFormulaValue">{{ $product['pv_formula'] ?? '0.00000000' }}</strong>
            </div>
            <div class="pool-note" id="productPvModeNote">
                สินค้า Firm ก็สามารถกำหนด PV เองได้ โดยเปิดตัวเลือกตั้งค่า PV เองด้านล่าง
            </div>
            <input type="hidden" name="product[pv_manual_override]" value="0">
            <label style="display:flex;align-items:center;gap:0.5rem;font-weight:500;">
                <input
                    id="product_pv_manual_override"
                    name="product[pv_manual_override]"
                    type="checkbox"
                    value="1"
                    @checked((string) ($product['pv_manual_override'] ?? '0') === '1')
                >
                ตั้งค่า PV เอง
            </label>
            <div class="product-pv-warning" id="productPvWarning" @if ((string) ($product['pv_manual_override'] ?? '0') !== '1') style="display:none" @endif>
                คุณกำลังใช้ค่า PV ที่ตั้งเอง ระบบจะไม่บังคับใช้สูตรอัตโนมัติจนกว่าจะปิดตัวเลือกนี้
            </div>
        </div>

        <div class="pool-field" data-firm-hide="1">
            <label for="product_pool_rate">Pool rate</label>
            <input id="product_pool_rate" name="product[pool_rate]" type="number" step="0.00000001" min="0" max="100" value="{{ old('product.pool_rate', $product['pool_rate'] ?? '0') }}" class="@if($fieldHasError('product.pool_rate')) pool-input-error @endif">
            @error('product.pool_rate')
                <div class="pool-field-error">{{ $message }}</div>
            @enderror
            <div class="pool-note">ค่านี้ต้องไม่เกิน 100 ถ้าหมายถึง 2.5% ให้กรอก `2.5`</div>
        </div>

        <div class="pool-field" data-firm-hide="1">
            <label for="product_active_days">Active days</label>
            <input id="product_active_days" name="product[active_days]" type="number" min="1" value="{{ old('product.active_days', $product['active_days'] ?? '30') }}" required class="@if($fieldHasError('product.active_days')) pool-input-error @endif">
            @error('product.active_days')
                <div class="pool-field-error">{{ $message }}</div>
            @enderror
            <div class="pool-note">จำนวนวันของรอบรายได้หลัง activate product</div>
        </div>

        <div class="pool-field" data-firm-hide="1">
            <label for="product_earning_cap_amount">Earning cap amount</label>
            <input id="product_earning_cap_amount" name="product[earning_cap_amount]" type="number" step="0.00000001" min="0" value="{{ old('product.earning_cap_amount', $product['earning_cap_amount'] ?? $product['member_price'] ?? '0') }}" required class="@if($fieldHasError('product.earning_cap_amount')) pool-input-error @endif">
            @error('product.earning_cap_amount')
                <div class="pool-field-error">{{ $message }}</div>
            @enderror
            <div class="pool-note">เพดานรายได้ของ cycle สำหรับสินค้ารายละเอียดนี้</div>
        </div>
    </div>

    <div class="pool-grid">
        <div class="pool-field">
            <label for="product_firm_enabled">เปิดขายใน Firm catalog</label>
            <select id="product_firm_enabled" name="product[firm_enabled]">
                <option value="0" @selected((string) ($product['firm_enabled'] ?? '0') === '0')>ปิด</option>
                <option value="1" @selected((string) ($product['firm_enabled'] ?? '0') === '1')>เปิด</option>
            </select>
            <div class="pool-note">สินค้าใน Firm catalog จะเปิดโหมดนี้อัตโนมัติ ส่วนสินค้าในหมวดปกติ ถ้าต้นทุนไม่เกิน 30% ของราคาสมาชิก จะสามารถเปิดให้ไปแสดงใน Firm catalog ได้และใช้ Firm แลกที่ 100% ของราคาสมาชิก</div>
            <div class="product-firm-warning" id="productFirmGuardNotice">
                ตรวจสอบ 30% cost guard จากต้นทุนและราคาสมาชิกเพื่อเปิดขายใน Firm catalog
            </div>
        </div>

        <div class="pool-field" id="productFirmOverrideField" @if ((string) ($product['is_firm_category'] ?? '0') === '1') style="display:none" @endif>
            <label for="product_firm_override_cost_guard">Override 30% cost guard</label>
            <select id="product_firm_override_cost_guard" name="product[firm_override_cost_guard]">
                <option value="0" @selected((string) ($product['firm_override_cost_guard'] ?? '0') === '0')>ปิด</option>
                <option value="1" @selected((string) ($product['firm_override_cost_guard'] ?? '0') === '1')>เปิด</option>
            </select>
            <div class="pool-note">ถ้าต้นทุนเกิน 30% admin ยังสามารถอนุญาตให้สินค้าไปแสดงใน Firm catalog ได้ แต่ระบบจะแสดงคำเตือนชัดเจน</div>
        </div>

        <div class="pool-field" id="productFirmAmountPaidField" @if ((string) ($product['firm_enabled'] ?? '0') !== '1') style="display:none" @endif>
            <label for="product_firm_amount_paid">ยอด Firm ที่จ่าย</label>
            <input id="product_firm_amount_paid" name="product[firm_amount_paid]" type="number" step="0.00000001" min="0" value="{{ old('product.firm_amount_paid', $product['firm_amount_paid'] ?? $product['member_price'] ?? '0') }}" class="@if($fieldHasError('product.firm_amount_paid')) pool-input-error @endif">
            @error('product.firm_amount_paid')
                <div class="pool-field-error">{{ $message }}</div>
            @enderror
            <div class="pool-note">จำนวน Firm ที่สมาชิกต้องใช้เพื่อสั่งสินค้านี้</div>
        </div>

        <div class="pool-field">
            <label for="product_firm_dcw_reward_amount">จำนวน DCW ที่ได้รับเมื่อใช้ Firm ซื้อ</label>
            <input id="product_firm_dcw_reward_amount" name="product[firm_dcw_reward_amount]" type="number" step="0.00000001" min="0" value="{{ old('product.firm_dcw_reward_amount', $product['firm_dcw_reward_amount'] ?? '0') }}" class="@if($fieldHasError('product.firm_dcw_reward_amount')) pool-input-error @endif">
            @error('product.firm_dcw_reward_amount')
                <div class="pool-field-error">{{ $message }}</div>
            @enderror
            <div class="pool-note">กำหนดจำนวน DCW ที่จะเครดิตเมื่อสมาชิกใช้ยอด Firm ซื้อสินค้านี้</div>
        </div>

        <div class="pool-field" id="productFirmRedeemLimitField" @if ((string) ($product['firm_enabled'] ?? '0') !== '1') style="display:none" @endif>
            <label for="product_firm_redeem_stock_limit">จำนวนที่ใช้ Firm ได้สูงสุด</label>
            <input id="product_firm_redeem_stock_limit" name="product[firm_redeem_stock_limit]" type="number" min="1" step="1" value="{{ old('product.firm_redeem_stock_limit', $product['firm_redeem_stock_limit'] ?? '') }}" class="@if($fieldHasError('product.firm_redeem_stock_limit')) pool-input-error @endif">
            @error('product.firm_redeem_stock_limit')
                <div class="pool-field-error">{{ $message }}</div>
            @enderror
            <div class="pool-note">ถ้าไม่กำหนด ระบบจะไม่จำกัดจำนวนจากกติกา Firm เพิ่มเติม และจะอิง stock ของสินค้าแทน ถ้ามีการตั้ง stock ไว้</div>
        </div>

        <div class="pool-field">
            <label for="product_stock_quantity">Stock quantity</label>
            <input id="product_stock_quantity" name="product[stock_quantity]" type="number" min="0" step="1" value="{{ old('product.stock_quantity', $product['stock_quantity'] ?? '') }}" class="@if($fieldHasError('product.stock_quantity')) pool-input-error @endif">
            @error('product.stock_quantity')
                <div class="pool-field-error">{{ $message }}</div>
            @enderror
            <div class="pool-note">กำหนด stock ของ SKU นี้โดยตรง ถ้าเว้นว่าง ระบบจะไม่จำกัด stock และจะขายได้ต่อเนื่องจนกว่าจะมีการตั้ง stock</div>
        </div>

        <div class="pool-field" data-firm-hide="1">
            <label for="product_dcw_spend_enabled">Allow DCW spend</label>
            <select id="product_dcw_spend_enabled" name="product[dcw_spend_enabled]">
                <option value="0" @selected((string) ($product['dcw_spend_enabled'] ?? '0') === '0')>No</option>
                <option value="1" @selected((string) ($product['dcw_spend_enabled'] ?? '0') === '1')>Yes</option>
            </select>
            <div class="pool-note">เปิดเพื่อให้สินค้านี้ตั้งค่า Discount Wallet ได้</div>
        </div>

        <div class="pool-field" data-firm-hide="1">
            <label for="product_dcw_usage_amount">DCW usage amount</label>
            <input id="product_dcw_usage_amount" name="product[dcw_usage_amount]" type="number" step="1" min="0" value="{{ old('product.dcw_usage_amount', $product['dcw_usage_amount'] ?? '0') }}" class="@if($fieldHasError('product.dcw_usage_amount')) pool-input-error @endif">
            @error('product.dcw_usage_amount')
                <div class="pool-field-error">{{ $message }}</div>
            @enderror
            <div class="pool-note">
                ค่าเริ่มต้นคำนวณจากสูตร `ราคาสมาชิก - (ต้นทุน x 70%)`
                และปัดลงเป็นจำนวนเต็มเสมอ
                ได้ <strong id="productDcwFormulaValue">{{ $product['dcw_usage_formula'] ?? '0' }}</strong>
            </div>
            <input type="hidden" name="product[dcw_usage_manual_override]" value="0">
            <label style="display:flex;align-items:center;gap:0.5rem;font-weight:500;">
                <input
                    id="product_dcw_usage_manual_override"
                    name="product[dcw_usage_manual_override]"
                    type="checkbox"
                    value="1"
                    @checked((string) ($product['dcw_usage_manual_override'] ?? '0') === '1')
                >
                ตั้งค่า DCW เอง
            </label>
            <div class="product-dcw-warning" id="productDcwWarning" @if ((string) ($product['dcw_usage_manual_override'] ?? '0') !== '1') style="display:none" @endif>
                คุณกำลัง override ค่า DCW จากสูตรอัตโนมัติ ระบบจะปัดลงเป็นจำนวนเต็มเสมอ ตรวจสอบให้แน่ใจว่าค่านี้ยังมากกว่าต้นทุนและสอดคล้องกับแผนโปรโมชัน
            </div>
        </div>

        <div class="pool-field" data-firm-hide="1">
            <label for="product_dcw_reward_rate">DCW reward rate</label>
            <input id="product_dcw_reward_rate" name="product[dcw_reward_rate]" type="number" step="0.00000001" min="0" max="100" value="{{ old('product.dcw_reward_rate', $product['dcw_reward_rate'] ?? '0') }}" class="@if($fieldHasError('product.dcw_reward_rate')) pool-input-error @endif">
            @error('product.dcw_reward_rate')
                <div class="pool-field-error">{{ $message }}</div>
            @enderror
            <div class="pool-note">ใช้ค่าเดียวกับยอดรวมของ cash + shopping wallet และรองรับการจ่ายผสม โดยยอด DCW ที่ได้จะปัดลงเป็นจำนวนเต็ม ค่านี้ต้องไม่เกิน 100</div>
        </div>
    </div>

    <div class="product-firm-mode" id="productFirmModeSummary" style="display:none;">
        โหมด Firm-to-DCW จะตั้งค่าให้อัตโนมัติบางส่วน เช่น cost = 0, retail = ยอด Firm, pool rate = 0, active days = 1, earning cap = ยอด Firm, และปิด DCW spend
        แต่ตอนนี้ admin สามารถกำหนด PV เองได้แล้ว หากต้องการใช้ค่าที่ต่างจากสูตรอัตโนมัติ
    </div>
</div>

<div class="pool-block">
    <h3>Presentation</h3>

    <div class="pool-grid">
        <div class="pool-field">
            <label for="product_rating_avg">Rating average</label>
            <input id="product_rating_avg" name="product[rating_avg]" type="number" step="0.01" min="0" value="{{ old('product.rating_avg', $product['rating_avg'] ?? '0') }}">
        </div>

        <div class="pool-field">
            <label for="product_rating_count">Rating count</label>
            <input id="product_rating_count" name="product[rating_count]" type="number" min="0" value="{{ old('product.rating_count', $product['rating_count'] ?? '0') }}">
        </div>

        <div class="pool-field">
            <label for="product_sort_order">Sort order</label>
            <input id="product_sort_order" name="product[sort_order]" type="number" value="{{ old('product.sort_order', $product['sort_order'] ?? '0') }}">
        </div>

        <div class="pool-field">
            <label for="product_status">Status</label>
            <select id="product_status" name="product[status]" required>
                <option value="ACTIVE" @selected((string) ($product['status'] ?? 'ACTIVE') === 'ACTIVE')>ACTIVE</option>
                <option value="INACTIVE" @selected((string) ($product['status'] ?? '') === 'INACTIVE')>INACTIVE</option>
            </select>
        </div>
    </div>

    <div class="pool-field">
        <label>Sales channel</label>
        <input type="hidden" id="product_sales_channel_mode" name="product[sales_channel_mode]" value="{{ old('product.sales_channel_mode', $product['sales_channel_mode'] ?? 'WAP_CATALOG') }}">
        <div class="product-sales-mode-grid" id="productSalesModeGrid">
            <label class="product-sales-mode-card" data-sales-mode-card="OFF">
                <div class="product-sales-mode-title">
                    <input type="checkbox" data-sales-mode-input="OFF" @checked((string) ($product['sales_channel_mode'] ?? 'WAP_CATALOG') === 'OFF')>
                    ปิด
                </div>
                <div class="product-sales-mode-detail">ไม่เปิดขายทุกช่องทาง</div>
            </label>

            <label class="product-sales-mode-card" data-sales-mode-card="WAP_CATALOG">
                <div class="product-sales-mode-title">
                    <input type="checkbox" data-sales-mode-input="WAP_CATALOG" @checked((string) ($product['sales_channel_mode'] ?? 'WAP_CATALOG') === 'WAP_CATALOG')>
                    WAP / Catalog
                </div>
                <div class="product-sales-mode-detail">เปิดขายที่ WAP และแสดงบนหน้า Home กับ Catalog</div>
            </label>

            <label class="product-sales-mode-card" data-sales-mode-card="CATALOG_ONLY">
                <div class="product-sales-mode-title">
                    <input type="checkbox" data-sales-mode-input="CATALOG_ONLY" @checked((string) ($product['sales_channel_mode'] ?? 'WAP_CATALOG') === 'CATALOG_ONLY')>
                    Catalog
                </div>
                <div class="product-sales-mode-detail">เปิดขายที่ Catalog แต่ไม่แสดงบนหน้า Home</div>
            </label>

            <label class="product-sales-mode-card" data-sales-mode-card="BAO_ONLY">
                <div class="product-sales-mode-title">
                    <input type="checkbox" data-sales-mode-input="BAO_ONLY" @checked((string) ($product['sales_channel_mode'] ?? 'WAP_CATALOG') === 'BAO_ONLY')>
                    BAO
                </div>
                <div class="product-sales-mode-detail">เปิดขายเฉพาะใน admin order create เท่านั้น</div>
            </label>
        </div>
        @error('product.sales_channel_mode')
            <div class="pool-field-error">{{ $message }}</div>
        @enderror
    </div>

    <div class="product-toggle-grid">
        <div class="pool-field">
            <label for="product_is_new">New</label>
            <select id="product_is_new" name="product[is_new]">
                <option value="0" @selected((string) ($product['is_new'] ?? '0') === '0')>No</option>
                <option value="1" @selected((string) ($product['is_new'] ?? '0') === '1')>Yes</option>
            </select>
        </div>

        <div class="pool-field">
            <label for="product_is_top">Top</label>
            <select id="product_is_top" name="product[is_top]">
                <option value="0" @selected((string) ($product['is_top'] ?? '0') === '0')>No</option>
                <option value="1" @selected((string) ($product['is_top'] ?? '0') === '1')>Yes</option>
            </select>
        </div>

        <div class="pool-field">
            <label for="product_is_featured">Featured</label>
            <select id="product_is_featured" name="product[is_featured]">
                <option value="0" @selected((string) ($product['is_featured'] ?? '0') === '0')>No</option>
                <option value="1" @selected((string) ($product['is_featured'] ?? '0') === '1')>Yes</option>
            </select>
        </div>

        <div class="pool-field">
            <label for="product_is_best_seller">Best seller</label>
            <select id="product_is_best_seller" name="product[is_best_seller]">
                <option value="0" @selected((string) ($product['is_best_seller'] ?? '0') === '0')>No</option>
                <option value="1" @selected((string) ($product['is_best_seller'] ?? '0') === '1')>Yes</option>
            </select>
        </div>
    </div>
</div>

<div class="product-action-footer">
    <button type="button" class="secondary" id="productBottomRemoveButton" @if (empty($product['id'])) style="display:none" @endif>Remove</button>
    <button type="button" class="primary" id="productBottomSubmitButton">{{ empty($product['id']) ? 'Create SKU' : 'Update' }}</button>
</div>

<script>
    (function () {
        const supplierSelect = document.getElementById('product_supplier_id');
        const categorySelect = document.getElementById('product_category_id');
        const productFamilySelect = document.getElementById('product_product_id');
        const productMetadata = @json($productMetadata);
        const categoryOptions = @json($categoryOptions);
        const existingImageUrls = @json($existingImageUrls);
        const productFamilyCode = document.getElementById('product_family_code');
        const productFamilyName = document.getElementById('product_family_name');
        const productCategoryName = document.getElementById('product_category_name');
        const productSupplierName = document.getElementById('product_supplier_name');
        const detailCodeInput = document.getElementById('product_code');
        const detailCodeHint = document.getElementById('productCodeHint');
        const galleryFilesInput = document.getElementById('product_gallery_files');
        const existingGalleryInputs = document.getElementById('product_existing_gallery_inputs');
        const homeCardFileInput = document.getElementById('product_home_card_file');
        const youtubeInput = document.getElementById('product_youtube_url');
        const imagePreview = document.getElementById('productImagePreview');
        const homeCardPreview = document.getElementById('productHomeCardPreview');
        const galleryPreview = document.getElementById('productGalleryPreview');
        const youtubeCard = document.getElementById('productYoutubeCard');
        const youtubeFrame = document.getElementById('productYoutubeFrame');
        const dropzone = document.getElementById('productDropzone');
        const costPriceInput = document.getElementById('product_cost_price');
        const memberPriceInput = document.getElementById('product_member_price');
        const memberPriceLabel = document.getElementById('productMemberPriceLabel');
        const memberPriceNote = document.getElementById('productMemberPriceNote');
        const retailPriceInput = document.getElementById('product_retail_price');
        const poolRateInput = document.getElementById('product_pool_rate');
        const activeDaysInput = document.getElementById('product_active_days');
        const earningCapInput = document.getElementById('product_earning_cap_amount');
        const pvInput = document.getElementById('product_pv');
        const pvManualOverrideInput = document.getElementById('product_pv_manual_override');
        const pvFormulaValue = document.getElementById('productPvFormulaValue');
        const pvModeNote = document.getElementById('productPvModeNote');
        const pvWarning = document.getElementById('productPvWarning');
        const dcwSpendEnabledInput = document.getElementById('product_dcw_spend_enabled');
        const dcwUsageInput = document.getElementById('product_dcw_usage_amount');
        const dcwManualOverrideInput = document.getElementById('product_dcw_usage_manual_override');
        const dcwFormulaValue = document.getElementById('productDcwFormulaValue');
        const dcwWarning = document.getElementById('productDcwWarning');
        const dcwRewardRateInput = document.getElementById('product_dcw_reward_rate');
        const firmEnabledInput = document.getElementById('product_firm_enabled');
        const firmOverrideInput = document.getElementById('product_firm_override_cost_guard');
        const firmGuardNotice = document.getElementById('productFirmGuardNotice');
        const firmOverrideField = document.getElementById('productFirmOverrideField');
        const firmAmountPaidField = document.getElementById('productFirmAmountPaidField');
        const firmAmountPaidInput = document.getElementById('product_firm_amount_paid');
        const firmRedeemLimitField = document.getElementById('productFirmRedeemLimitField');
        const firmModeSummary = document.getElementById('productFirmModeSummary');
        const firmHiddenFields = Array.from(document.querySelectorAll('[data-firm-hide="1"]'));
        const salesModeHiddenInput = document.getElementById('product_sales_channel_mode');
        const salesModeInputs = Array.from(document.querySelectorAll('[data-sales-mode-input]'));
        const salesModeCards = Array.from(document.querySelectorAll('[data-sales-mode-card]'));
        const bottomSubmitButton = document.getElementById('productBottomSubmitButton');
        const bottomRemoveButton = document.getElementById('productBottomRemoveButton');
        const firstErrorInput = document.querySelector('.pool-input-error');
        const fallbackImage = imagePreview.getAttribute('src');
        const fallbackHomeCardImage = homeCardPreview.getAttribute('src');
        const constrainedInputs = Array.from(document.querySelectorAll('input[max], input[min], input[required], select[required], textarea[required]'));
        const richDescriptionTextarea = document.getElementById('product_description');
        const richDescriptionEditor = document.getElementById('product_description_editor');
        const richDescriptionPreview = document.getElementById('product_description_preview');
        const iconPickerBackdrop = document.getElementById('productIconPickerBackdrop');
        const iconPickerClose = document.getElementById('productIconPickerClose');
        const iconPickerSearch = document.getElementById('productIconPickerSearch');
        const iconPickerBody = document.getElementById('productIconPickerBody');
        const productForm = richDescriptionTextarea ? richDescriptionTextarea.closest('form') : null;
        let selectedRichDescriptionImage = null;
        let lastRichDescriptionRange = null;
        const richTextIconCatalog = [
            { category: 'Smile', icons: ['😀','😃','😄','😁','😆','😊','🙂','😉','😍','🥰','😘','😋','😎','🤩','🥳','😇'] },
            { category: 'Love', icons: ['❤','💖','💗','💘','💕','💞','💓','💝','💟','💚','💙','💛','🧡','💜'] },
            { category: 'Sale', icons: ['🔥','✨','⭐','🌟','💯','🎉','🎁','🛒','📦','📣','💥','🏷','💸','🪙'] },
            { category: 'Check', icons: ['✓','✅','✔','☑','👌','👍','🙌','👏','📌','➡','➜','➤','❗','❇'] },
            { category: 'Health', icons: ['🌿','🍀','🍃','🌱','🫶','💪','🧘','🥗','🍎','🍋','🫚','🧴','🛡'] },
            { category: 'Beauty', icons: ['💄','💎','🪞','🧴','🫧','🌸','🌺','🌼','🦋','👑','💅'] },
            { category: 'Food', icons: ['🍽','☕','🍵','🍯','🥛','🍓','🍇','🥑','🥜','🍪','🍫'] },
            { category: 'Business', icons: ['📈','📊','🧾','🧠','🕒','📍','🔔','📞','💬','🖥','📱'] },
            { category: 'Arrows', icons: ['←','↑','→','↓','↗','↘','↙','↖','↔','↕','⟶','⟵','➡','➜','➤','▶','▷'] },
            { category: 'Bullets', icons: ['•','◦','▪','▫','●','○','■','□','◆','◇','★','☆','✦','✧'] },
            { category: 'Warnings', icons: ['⚠','🚨','❗','❕','⛔','🚫','🔴','🟠','🟡','🟢','🔵','🟣'] },
            { category: 'Nature', icons: ['🌳','🌴','🌵','🪴','🌷','🌹','🌻','🌞','🌈','💧','🌊','❄'] },
            { category: 'Fitness', icons: ['🏃','🚴','🏋','🤸','⚽','🏀','🎾','🥇','🏆','⌚','👟'] },
            { category: 'Home', icons: ['🏠','🏡','🛏','🛋','🚪','🪑','🧺','🧹','🧼','🪞','🛁'] },
            { category: 'Tech', icons: ['💻','⌨','🖱','🖨','🔋','🔌','📷','🎥','🎧','📡','🧩'] },
            { category: 'Social', icons: ['👋','🙏','🤝','👏','🙋','💁','🫰','🤟','🙌','🗨','📣'] },
            { category: 'Travel', icons: ['🚗','🛵','🚲','✈','🚚','⛽','🧳','🗺','📍','🏝','🏖'] },
            { category: 'Money', icons: ['💵','💶','💷','💴','💳','🧾','🏷','💰','🪙','📉','📈'] }
        ];
        let retainedExistingImageUrls = existingImageUrls.slice(0, 10);
        let selectedGalleryFiles = Array.from(galleryFilesInput.files || []).filter(function (file) {
            return file.type.startsWith('image/');
        }).slice(0, 10);
        let galleryOrderTokens = [];
        let draggedGalleryToken = null;
        let touchDraggedGalleryToken = null;
        let touchDropGalleryToken = null;
        const IMAGE_MAX_DIMENSION = 1400;
        const GALLERY_TARGET_BYTES = 550 * 1024;
        const HOME_CARD_TARGET_BYTES = 450 * 1024;
        const INLINE_RICH_IMAGE_MAX_DIMENSION = 1200;
        const INLINE_RICH_IMAGE_TARGET_BYTES = 320 * 1024;
        const initialProductOptions = Array.from(productFamilySelect.options)
            .filter(function (option) {
                return option.value !== '';
            })
            .map(function (option) {
                return {
                    value: option.value,
                    label: option.textContent,
                    supplierId: String(option.dataset.supplierId || ''),
                    categoryId: String(option.dataset.categoryId || ''),
                };
            });
        const initialCategoryOptions = Array.from(categorySelect.options)
            .filter(function (option) {
                return option.value !== '';
            })
            .map(function (option) {
                return {
                    value: option.value,
                    label: option.textContent,
                };
            });

        function applyProductFamilyMetadata() {
            const meta = productMetadata[String(productFamilySelect.value)] || {};
            productFamilyCode.value = meta.product_code || '';
            productFamilyName.value = meta.product_name || '';
            productCategoryName.value = meta.category_name || '';
            productSupplierName.value = meta.supplier_name || '';
        }

        function repopulateSelect(select, options, selectedValue, placeholder) {
            select.innerHTML = '';

            const placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            placeholderOption.textContent = placeholder;
            select.appendChild(placeholderOption);

            options.forEach(function (option) {
                const node = document.createElement('option');
                node.value = option.value;
                node.textContent = option.label;

                if (option.supplierId) {
                    node.dataset.supplierId = option.supplierId;
                }

                if (option.categoryId) {
                    node.dataset.categoryId = option.categoryId;
                }

                if (String(option.value) === String(selectedValue || '')) {
                    node.selected = true;
                }

                select.appendChild(node);
            });
        }

        function filteredCategoryOptions() {
            const supplierId = String(supplierSelect.value || '');

            if (!supplierId) {
                return initialCategoryOptions;
            }

            return initialCategoryOptions.filter(function (option) {
                const meta = categoryOptions[String(option.value)] || {};
                return String(meta.supplier_id || '') === supplierId;
            });
        }

        function selectedCategoryMeta() {
            return categoryOptions[String(categorySelect.value)] || {};
        }

        function filteredProductOptions() {
            const supplierId = String(supplierSelect.value || '');
            const categoryId = String(categorySelect.value || '');

            return initialProductOptions.filter(function (option) {
                if (supplierId && option.supplierId !== supplierId) {
                    return false;
                }

                if (categoryId && option.categoryId !== categoryId) {
                    return false;
                }

                return true;
            });
        }

        function syncCategoryOptions() {
            const selectedCategory = String(categorySelect.value || '');
            const options = filteredCategoryOptions();
            const hasSelected = options.some(function (option) {
                return String(option.value) === selectedCategory;
            });

            repopulateSelect(categorySelect, options, hasSelected ? selectedCategory : '', 'Select category');
        }

        function syncProductFamilyOptions() {
            const selectedProduct = String(productFamilySelect.value || '');
            const options = filteredProductOptions();
            const hasSelected = options.some(function (option) {
                return String(option.value) === selectedProduct;
            });

            repopulateSelect(productFamilySelect, options, hasSelected ? selectedProduct : '', 'Select product family');
        }

        function syncFamilyInputMode() {
            const hasSelectedFamily = String(productFamilySelect.value || '') !== '';

            productFamilyCode.readOnly = hasSelectedFamily;
            productFamilyName.readOnly = hasSelectedFamily;
            productFamilyCode.style.background = hasSelectedFamily ? '#f8fafc' : '#fff';
            productFamilyName.style.background = hasSelectedFamily ? '#f8fafc' : '#fff';

            if (!hasSelectedFamily) {
                productCategoryName.value = categorySelect.options[categorySelect.selectedIndex]?.textContent || '';
                productSupplierName.value = supplierSelect.options[supplierSelect.selectedIndex]?.textContent || '';
            }
        }

        function updateSalesModeUi(selectedMode) {
            salesModeInputs.forEach(function (input) {
                const isActive = input.getAttribute('data-sales-mode-input') === selectedMode;
                input.checked = isActive;
            });

            salesModeCards.forEach(function (card) {
                const isActive = card.getAttribute('data-sales-mode-card') === selectedMode;
                card.classList.toggle('is-active', isActive);
            });

            if (salesModeHiddenInput) {
                salesModeHiddenInput.value = selectedMode;
            }
        }

        salesModeInputs.forEach(function (input) {
            input.addEventListener('change', function () {
                const mode = input.getAttribute('data-sales-mode-input') || 'WAP_CATALOG';
                updateSalesModeUi(mode);
            });
        });

        updateSalesModeUi((salesModeHiddenInput && salesModeHiddenInput.value) || 'WAP_CATALOG');

        function findCommandButton(label) {
            return Array.from(document.querySelectorAll('button, a')).find(function (node) {
                return node.textContent && node.textContent.trim() === label;
            });
        }

        if (bottomSubmitButton) {
            bottomSubmitButton.addEventListener('click', function () {
                syncRichDescriptionValue();
                const targetLabel = bottomSubmitButton.textContent.trim();
                const commandButton = findCommandButton(targetLabel);

                if (commandButton && commandButton !== bottomSubmitButton) {
                    commandButton.click();
                }
            });
        }

        if (bottomRemoveButton) {
            bottomRemoveButton.addEventListener('click', function () {
                syncRichDescriptionValue();
                const commandButton = findCommandButton('Remove');

                if (commandButton && commandButton !== bottomRemoveButton) {
                    commandButton.click();
                }
            });
        }

        function syncDetailCodeSuggestion(force) {
            const meta = categoryOptions[String(categorySelect.value)] || {};
            const suggested = String(meta.next_detail_code || '');
            const currentValue = detailCodeInput.value.trim();

            if (!suggested || !detailCodeHint) {
                if (detailCodeHint) {
                    detailCodeHint.textContent = 'ปล่อยว่างได้ ระบบจะ generate SKU ตอนกดบันทึกสำเร็จเท่านั้น และยังแก้เองได้ถ้าต้องการ';
                }
                detailCodeInput.placeholder = '';
                return;
            }

            if (currentValue === '') {
                detailCodeInput.placeholder = suggested;
            }

            detailCodeHint.textContent = `ปล่อยว่างได้ ระบบจะ generate SKU ตอนกดบันทึกสำเร็จเท่านั้น เลขถัดไปตอนนี้คือ ${suggested}`;
        }

        function syncSelectorsFromProductFamily() {
            const meta = productMetadata[String(productFamilySelect.value)] || {};

            if (meta.supplier_id) {
                supplierSelect.value = String(meta.supplier_id);
            }

            syncCategoryOptions();

            if (meta.category_id) {
                categorySelect.value = String(meta.category_id);
            }
        }

        function youtubeEmbedUrl(url) {
            if (!url) return '';
            try {
                const parsed = new URL(url);
                let videoId = '';
                if (parsed.hostname.includes('youtu.be')) {
                    videoId = parsed.pathname.replace(/^\/+/, '');
                } else {
                    videoId = parsed.searchParams.get('v') || '';
                    if (!videoId && parsed.pathname.startsWith('/embed/')) {
                        videoId = parsed.pathname.replace('/embed/', '');
                    }
                    if (!videoId && parsed.pathname.startsWith('/shorts/')) {
                        videoId = parsed.pathname.replace('/shorts/', '');
                    }
                }
                return videoId
                    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0&playsinline=1`
                    : '';
            } catch (error) {
                return '';
            }
        }

        function updateYoutubePreview() {
            const embedUrl = youtubeEmbedUrl(youtubeInput.value.trim());
            if (!embedUrl) {
                youtubeCard.style.display = 'none';
                youtubeFrame.setAttribute('src', '');
                return;
            }
            youtubeCard.style.display = '';
            youtubeFrame.setAttribute('src', embedUrl);
        }

        function loadImageFromFile(file) {
            return new Promise(function (resolve, reject) {
                const objectUrl = URL.createObjectURL(file);
                const image = new Image();

                image.onload = function () {
                    URL.revokeObjectURL(objectUrl);
                    resolve(image);
                };

                image.onerror = function () {
                    URL.revokeObjectURL(objectUrl);
                    reject(new Error('Unable to load image.'));
                };

                image.src = objectUrl;
            });
        }

        function canvasToBlob(canvas, mimeType, quality) {
            return new Promise(function (resolve, reject) {
                canvas.toBlob(function (blob) {
                    if (!blob) {
                        reject(new Error('Unable to prepare image blob.'));
                        return;
                    }

                    resolve(blob);
                }, mimeType, quality);
            });
        }

        async function compressImageFile(file, options) {
            if (!(file instanceof File) || !file.type.startsWith('image/')) {
                return file;
            }

            const maxDimension = Number(options && options.maxDimension) || IMAGE_MAX_DIMENSION;
            const targetBytes = Number(options && options.targetBytes) || GALLERY_TARGET_BYTES;
            const preferredMimeType = (options && options.mimeType) || 'image/webp';
            const image = await loadImageFromFile(file);
            const width = image.naturalWidth || image.width || 0;
            const height = image.naturalHeight || image.height || 0;

            if (!width || !height) {
                return file;
            }

            const scale = Math.min(1, maxDimension / Math.max(width, height));
            const targetWidth = Math.max(1, Math.round(width * scale));
            const targetHeight = Math.max(1, Math.round(height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;

            const context = canvas.getContext('2d');
            if (!context) {
                return file;
            }

            context.drawImage(image, 0, 0, targetWidth, targetHeight);

            const sourceExt = (file.name.split('.').pop() || '').toLowerCase();
            const outputExt = preferredMimeType === 'image/png'
                ? 'png'
                : preferredMimeType === 'image/jpeg'
                    ? 'jpg'
                    : 'webp';

            let quality = 0.9;
            let attemptBlob = await canvasToBlob(canvas, preferredMimeType, quality);

            while (attemptBlob.size > targetBytes && quality > 0.42) {
                quality -= 0.08;
                attemptBlob = await canvasToBlob(canvas, preferredMimeType, quality);
            }

            if (attemptBlob.size >= file.size && scale === 1) {
                return file;
            }

            const basename = file.name.replace(/\.[^.]+$/, '') || 'image';
            const finalName = sourceExt === outputExt
                ? file.name
                : basename + '.' + outputExt;

            return new File([attemptBlob], finalName, {
                type: attemptBlob.type || preferredMimeType,
                lastModified: Date.now(),
            });
        }

        async function compressImageFiles(files, options) {
            const prepared = [];

            for (const file of Array.from(files || [])) {
                if (!file || !file.type || !file.type.startsWith('image/')) {
                    continue;
                }

                prepared.push(await compressImageFile(file, options));
            }

            return prepared;
        }

        async function setSingleInputFile(input, file, options) {
            if (!input) {
                return null;
            }

            const nextFile = file ? await compressImageFile(file, options) : null;
            const transfer = new DataTransfer();

            if (nextFile) {
                transfer.items.add(nextFile);
            }

            input.files = transfer.files;
            return nextFile;
        }

        function updateImagePreview(url) {
            imagePreview.src = resolveImagePreviewUrl(url) || fallbackImage;
        }

        function updateHomeCardPreview() {
            if (!homeCardFileInput || !homeCardPreview) {
                return;
            }

            const file = Array.from(homeCardFileInput.files || []).find(function (entry) {
                return entry.type.startsWith('image/');
            });

            if (file) {
                homeCardPreview.src = URL.createObjectURL(file);
                return;
            }

            homeCardPreview.src = resolveImagePreviewUrl(@json($product['home_card_image_url'] ?? '')) || fallbackHomeCardImage;
        }

        function galleryFileFingerprint(file) {
            return [file.name, file.size, file.type].join('::');
        }

        function existingGalleryToken(url) {
            return 'existing::' + url;
        }

        function uploadGalleryToken(file) {
            return 'upload::' + galleryFileFingerprint(file);
        }

        function syncGalleryOrderState() {
            const availableTokens = selectedGalleryFiles.map(uploadGalleryToken)
                .concat(retainedExistingImageUrls.map(existingGalleryToken));
            const availableTokenSet = new Set(availableTokens);

            galleryOrderTokens = galleryOrderTokens.filter(function (token) {
                return availableTokenSet.has(token);
            });

            availableTokens.forEach(function (token) {
                if (!galleryOrderTokens.includes(token)) {
                    galleryOrderTokens.push(token);
                }
            });

            galleryOrderTokens = galleryOrderTokens.slice(0, 10);
        }

        function syncGalleryFilesInput() {
            const transfer = new DataTransfer();

            selectedGalleryFiles.forEach(function (file) {
                transfer.items.add(file);
            });

            galleryFilesInput.files = transfer.files;
        }

        function appendGalleryFiles(files) {
            if (!Array.isArray(files) || files.length === 0) {
                return;
            }

            const mergedFiles = selectedGalleryFiles.concat(files)
                .filter(function (file) {
                    return file && file.type.startsWith('image/');
                });
            const seen = new Set();

            selectedGalleryFiles = mergedFiles.filter(function (file) {
                const fingerprint = galleryFileFingerprint(file);

                if (seen.has(fingerprint)) {
                    return false;
                }

                seen.add(fingerprint);

                return true;
            }).slice(0, 10);

            syncGalleryFilesInput();
        }

        function syncExistingGalleryInputs() {
            if (!existingGalleryInputs) {
                return;
            }

            existingGalleryInputs.innerHTML = '';

            retainedExistingImageUrls.forEach(function (url) {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = 'product[existing_image_urls][]';
                input.value = url;
                existingGalleryInputs.appendChild(input);
            });

            galleryOrderTokens.forEach(function (token) {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = 'product[gallery_order][]';
                input.value = token;
                existingGalleryInputs.appendChild(input);
            });
        }

        function removeGalleryFile(index) {
            selectedGalleryFiles = selectedGalleryFiles.filter(function (_, fileIndex) {
                return fileIndex !== index;
            });

            syncGalleryOrderState();
            syncGalleryFilesInput();
            syncExistingGalleryInputs();
            updateGalleryPreview();
        }

        function removeExistingGalleryImage(index) {
            retainedExistingImageUrls = retainedExistingImageUrls.filter(function (_, imageIndex) {
                return imageIndex !== index;
            });

            syncGalleryOrderState();
            syncExistingGalleryInputs();
            updateGalleryPreview();
        }

        function galleryPreviewItems() {
            syncGalleryOrderState();

            return galleryOrderTokens.map(function (token) {
                if (token.startsWith('upload::')) {
                    const file = selectedGalleryFiles.find(function (entry) {
                        return uploadGalleryToken(entry) === token;
                    });

                    if (!file) {
                        return null;
                    }

                    return {
                        type: 'upload',
                        token: token,
                        index: selectedGalleryFiles.indexOf(file),
                        url: URL.createObjectURL(file),
                    };
                }

                if (token.startsWith('existing::')) {
                    const url = token.slice('existing::'.length);
                    if (!retainedExistingImageUrls.includes(url)) {
                        return null;
                    }

                    return {
                        type: 'existing',
                        token: token,
                        index: retainedExistingImageUrls.indexOf(url),
                        url: resolveImagePreviewUrl(url),
                    };
                }

                return null;
            }).filter(function (item) {
                return item && item.url;
            }).slice(0, 10);
        }

        function moveGalleryToken(token, direction) {
            const currentIndex = galleryOrderTokens.indexOf(token);

            if (currentIndex < 0) {
                return;
            }

            const nextIndex = direction === 'left'
                ? currentIndex - 1
                : currentIndex + 1;

            if (nextIndex < 0 || nextIndex >= galleryOrderTokens.length) {
                return;
            }

            const swapped = galleryOrderTokens[nextIndex];
            galleryOrderTokens[nextIndex] = galleryOrderTokens[currentIndex];
            galleryOrderTokens[currentIndex] = swapped;
            syncExistingGalleryInputs();
            updateGalleryPreview();
        }

        function moveGalleryTokenBefore(sourceToken, targetToken) {
            if (!sourceToken || !targetToken || sourceToken === targetToken) {
                return;
            }

            const sourceIndex = galleryOrderTokens.indexOf(sourceToken);
            const targetIndex = galleryOrderTokens.indexOf(targetToken);

            if (sourceIndex < 0 || targetIndex < 0) {
                return;
            }

            const nextOrder = galleryOrderTokens.slice();
            nextOrder.splice(sourceIndex, 1);
            const adjustedTargetIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
            nextOrder.splice(adjustedTargetIndex, 0, sourceToken);
            galleryOrderTokens = nextOrder;
            syncExistingGalleryInputs();
            updateGalleryPreview();
        }

        function clearGalleryDropTargets() {
            galleryPreview.querySelectorAll('.product-gallery-thumb').forEach(function (node) {
                node.classList.remove('is-drop-target');
                node.classList.remove('is-touch-dragging');
            });
        }

        function updateGalleryPreview() {
            const items = galleryPreviewItems();

            galleryPreview.innerHTML = '';
            syncExistingGalleryInputs();

            updateImagePreview(items[0]?.url || '');

            items.forEach(function (item, index) {
                const shell = document.createElement('div');
                shell.className = 'product-gallery-thumb';
                shell.draggable = true;
                shell.dataset.galleryToken = item.token;

                shell.addEventListener('dragstart', function (event) {
                    draggedGalleryToken = item.token;
                    shell.classList.add('is-dragging');
                    if (event.dataTransfer) {
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/plain', item.token);
                    }
                });

                shell.addEventListener('dragend', function () {
                    draggedGalleryToken = null;
                    shell.classList.remove('is-dragging');
                    clearGalleryDropTargets();
                });

                shell.addEventListener('dragover', function (event) {
                    if (!draggedGalleryToken || draggedGalleryToken === item.token) {
                        return;
                    }

                    event.preventDefault();
                    if (event.dataTransfer) {
                        event.dataTransfer.dropEffect = 'move';
                    }
                    shell.classList.add('is-drop-target');
                });

                shell.addEventListener('dragleave', function () {
                    shell.classList.remove('is-drop-target');
                });

                shell.addEventListener('drop', function (event) {
                    if (!draggedGalleryToken || draggedGalleryToken === item.token) {
                        return;
                    }

                    event.preventDefault();
                    shell.classList.remove('is-drop-target');
                    moveGalleryTokenBefore(draggedGalleryToken, item.token);
                });

                shell.addEventListener('touchstart', function (event) {
                    const target = event.target;
                    if (target && target.closest && target.closest('button')) {
                        return;
                    }

                    touchDraggedGalleryToken = item.token;
                    touchDropGalleryToken = item.token;
                    clearGalleryDropTargets();
                    shell.classList.add('is-touch-dragging');
                }, { passive: true });

                shell.addEventListener('touchmove', function (event) {
                    if (!touchDraggedGalleryToken) {
                        return;
                    }

                    const touch = event.touches && event.touches[0];
                    if (!touch) {
                        return;
                    }

                    const targetNode = document.elementFromPoint(touch.clientX, touch.clientY);
                    const targetThumb = targetNode && targetNode.closest
                        ? targetNode.closest('.product-gallery-thumb')
                        : null;

                    clearGalleryDropTargets();
                    shell.classList.add('is-touch-dragging');

                    if (
                        targetThumb
                        && targetThumb.dataset
                        && targetThumb.dataset.galleryToken
                        && targetThumb.dataset.galleryToken !== touchDraggedGalleryToken
                    ) {
                        touchDropGalleryToken = targetThumb.dataset.galleryToken;
                        targetThumb.classList.add('is-drop-target');
                    } else {
                        touchDropGalleryToken = item.token;
                    }

                    event.preventDefault();
                }, { passive: false });

                shell.addEventListener('touchend', function () {
                    if (
                        touchDraggedGalleryToken
                        && touchDropGalleryToken
                        && touchDropGalleryToken !== touchDraggedGalleryToken
                    ) {
                        moveGalleryTokenBefore(touchDraggedGalleryToken, touchDropGalleryToken);
                    }

                    touchDraggedGalleryToken = null;
                    touchDropGalleryToken = null;
                    clearGalleryDropTargets();
                });

                shell.addEventListener('touchcancel', function () {
                    touchDraggedGalleryToken = null;
                    touchDropGalleryToken = null;
                    clearGalleryDropTargets();
                });

                const img = document.createElement('img');
                img.src = item.url;
                img.alt = `Gallery image ${index + 1}`;

                const moveActions = document.createElement('div');
                moveActions.className = 'product-gallery-move';

                const moveLeftButton = document.createElement('button');
                moveLeftButton.type = 'button';
                moveLeftButton.setAttribute('aria-label', `Move gallery image ${index + 1} left`);
                moveLeftButton.textContent = '←';
                moveLeftButton.disabled = index === 0;
                moveLeftButton.addEventListener('click', function () {
                    moveGalleryToken(item.token, 'left');
                });

                const moveRightButton = document.createElement('button');
                moveRightButton.type = 'button';
                moveRightButton.setAttribute('aria-label', `Move gallery image ${index + 1} right`);
                moveRightButton.textContent = '→';
                moveRightButton.disabled = index === items.length - 1;
                moveRightButton.addEventListener('click', function () {
                    moveGalleryToken(item.token, 'right');
                });

                moveActions.appendChild(moveLeftButton);
                moveActions.appendChild(moveRightButton);

                const removeButton = document.createElement('button');
                removeButton.type = 'button';
                removeButton.className = 'product-gallery-remove';
                removeButton.setAttribute('aria-label', `Remove gallery image ${index + 1}`);
                removeButton.textContent = '×';
                removeButton.addEventListener('click', function () {
                    if (item.type === 'upload') {
                        removeGalleryFile(item.index);
                        return;
                    }

                    removeExistingGalleryImage(item.index);
                });

                const badge = document.createElement('div');
                badge.className = 'product-gallery-badge';
                badge.textContent = index === 0 ? 'ภาพหลัก' : `ลำดับ ${index + 1}`;

                shell.appendChild(moveActions);
                shell.appendChild(img);
                shell.appendChild(removeButton);
                shell.appendChild(badge);
                galleryPreview.appendChild(shell);
            });
        }

        function resolveImagePreviewUrl(url) {
            const trimmed = (url || '').trim();
            if (!trimmed) {
                return '';
            }

            if (
                trimmed.startsWith('data:image/')
                || trimmed.startsWith('blob:')
                || trimmed.startsWith('http://')
                || trimmed.startsWith('https://')
                || trimmed.startsWith('/storage/')
            ) {
                return trimmed;
            }

            return `/storage/${trimmed.replace(/^\/+/, '')}`;
        }

        function computedPv() {
            const cost = Number(costPriceInput.value || 0);
            const member = Number(memberPriceInput.value || 0);
            const pv = Math.max(0, (member - cost) * 0.8);

            return pv.toFixed(8);
        }

        function syncPvState() {
            const formula = computedPv();
            const manual = pvManualOverrideInput.checked;

            pvFormulaValue.textContent = formula;
            pvInput.readOnly = !manual;
            pvInput.style.background = manual ? '#fff' : '#f8fafc';
            pvWarning.style.display = manual ? '' : 'none';

            if (!manual) {
                pvInput.value = formula;
            }
        }

        function computedDcwUsage() {
            const cost = Number(costPriceInput.value || 0);
            const member = Number(memberPriceInput.value || 0);
            const dcw = Math.floor(Math.max(0, member - (cost * 0.7)));

            return String(dcw);
        }

        function syncDcwState() {
            const formula = computedDcwUsage();
            const manual = dcwManualOverrideInput.checked;

            dcwFormulaValue.textContent = formula;
            dcwUsageInput.readOnly = !manual;
            dcwUsageInput.style.background = manual ? '#fff' : '#f8fafc';
            dcwWarning.style.display = manual ? '' : 'none';

            if (!manual) {
                dcwUsageInput.value = formula;
            }
        }

        function passesFirmGuard() {
            const cost = Number(costPriceInput.value || 0);
            const member = Number(memberPriceInput.value || 0);

            if (!Number.isFinite(member) || member <= 0) {
                return false;
            }

            return cost <= (member * 0.3);
        }

        function syncFirmState() {
            if (!firmEnabledInput || !firmGuardNotice) {
                return;
            }

            const categoryMeta = selectedCategoryMeta();
            const isFirmCategory = String(categoryMeta.code || '').trim().toLowerCase() === 'firm'
                || categoryMeta.is_firm_category === true;
            const guardPassed = passesFirmGuard();
            let firmEnabled = String(firmEnabledInput.value || '0') === '1';
            const firmOverride = firmOverrideInput && String(firmOverrideInput.value || '0') === '1';
            const enabledOption = Array.from(firmEnabledInput.options).find(function (option) {
                return option.value === '1';
            });
            const disabledOption = Array.from(firmEnabledInput.options).find(function (option) {
                return option.value === '0';
            });

            if (isFirmCategory) {
                firmEnabled = true;
                firmEnabledInput.value = '1';
            }

            if (disabledOption) {
                disabledOption.disabled = false;
            }

            if (firmOverrideField) {
                firmOverrideField.style.display = isFirmCategory ? 'none' : '';
            }

            firmHiddenFields.forEach(function (field) {
                field.style.display = isFirmCategory ? 'none' : '';
            });

            if (memberPriceLabel) {
                memberPriceLabel.textContent = 'Member price';
            }

            if (memberPriceNote) {
                memberPriceNote.textContent = !isFirmCategory && firmEnabled
                    ? 'ราคาสมาชิกของ SKU นี้ และจะใช้เป็นจำนวน Firm 100% เมื่อลูกค้าแลกผ่าน Firm catalog'
                    : 'ราคาสมาชิกของ SKU นี้';
            }

            if (firmAmountPaidField) {
                firmAmountPaidField.style.display = isFirmCategory ? '' : 'none';
            }

            if (firmRedeemLimitField) {
                firmRedeemLimitField.style.display = firmEnabled ? '' : 'none';
            }

            if (firmModeSummary) {
                firmModeSummary.style.display = isFirmCategory ? '' : 'none';
            }

            if (isFirmCategory) {
                if (firmAmountPaidInput) {
                    memberPriceInput.value = firmAmountPaidInput.value || memberPriceInput.value || '0';
                }
                costPriceInput.value = '0';
                retailPriceInput.value = memberPriceInput.value || '0';
                poolRateInput.value = '0';
                activeDaysInput.value = '1';
                earningCapInput.value = memberPriceInput.value || '0';
                dcwSpendEnabledInput.value = '0';
                dcwUsageInput.value = '0';
                dcwRewardRateInput.value = '0';
            }

            if (pvModeNote) {
                pvModeNote.textContent = isFirmCategory
                    ? 'สินค้า Firm สามารถกำหนด PV เองได้ ถ้าไม่เปิด override ระบบจะใช้สูตรจากยอด Firm อัตโนมัติ'
                    : 'สินค้า Firm ก็สามารถกำหนด PV เองได้ โดยเปิดตัวเลือกตั้งค่า PV เองด้านล่าง';
            }

            if (isFirmCategory) {
                firmGuardNotice.textContent = 'สินค้าใน Firm catalog ใช้โหมด Firm-to-DCW อัตโนมัติ และกำหนดเฉพาะยอด Firm ที่จ่ายกับจำนวน DCW ที่ได้รับ';
                firmGuardNotice.style.background = '#eff6ff';
                firmGuardNotice.style.borderColor = '#93c5fd';
                firmGuardNotice.style.color = '#1d4ed8';
                return;
            }

            if (firmEnabled && !guardPassed && firmOverride) {
                firmGuardNotice.textContent = 'คำเตือน: สินค้านี้ต้นทุนเกิน 30% แต่ admin อนุญาตให้แสดงใน Firm catalog แล้ว ระบบจะให้ใช้ Firm แลกได้ตามราคาสมาชิกเต็ม 100%';
                firmGuardNotice.style.background = '#fff7ed';
                firmGuardNotice.style.borderColor = '#fdba74';
                firmGuardNotice.style.color = '#c2410c';
                return;
            }

            firmGuardNotice.textContent = firmEnabled
                ? 'สินค้านี้จะแสดงใน Firm catalog และใช้ Firm แลกได้ 100% ของราคาสมาชิก'
                : guardPassed
                    ? 'ผ่าน 30% cost guard แล้ว สามารถเปิดให้แสดงใน Firm catalog ได้ และสามารถปิดได้'
                    : 'ยังไม่ผ่าน 30% cost guard แต่ admin สามารถเปิด override เพื่ออนุญาตได้';
            firmGuardNotice.style.background = guardPassed ? '#eff6ff' : '#fef2f2';
            firmGuardNotice.style.borderColor = guardPassed ? '#93c5fd' : '#fca5a5';
            firmGuardNotice.style.color = guardPassed ? '#1d4ed8' : '#b91c1c';
        }

        function syncInputValidityState(input) {
            if (!input) {
                return;
            }

            if (input.checkValidity()) {
                input.classList.remove('pool-input-error');
                return;
            }

            input.classList.add('pool-input-error');
        }

        function escapeHtml(value) {
            return String(value || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function looksLikeHtml(value) {
            return /<\/?[a-z][\s\S]*>/i.test(String(value || ''));
        }

        function plainTextToEditorHtml(value) {
            const normalized = String(value || '').replace(/\r\n?/g, '\n').trim();

            if (!normalized) {
                return '<p><br></p>';
            }

            return normalized
                .split(/\n{2,}/)
                .map(function (paragraph) {
                    return '<p>' + escapeHtml(paragraph).replace(/\n/g, '<br>') + '</p>';
                })
                .join('');
        }

        function sanitizeCssValue(property, value) {
            const normalized = String(value || '').trim().toLowerCase();

            if (!normalized) {
                return null;
            }

            if (property === 'text-align') {
                return ['left', 'center', 'right', 'justify'].includes(normalized) ? normalized : null;
            }

            if (property === 'font-size') {
                return /^([0-9]{1,3})(px|rem|em|%)$/.test(normalized) ? normalized : null;
            }

            if (property === 'color') {
                return /^#[0-9a-f]{3,8}$/.test(normalized) ? normalized : null;
            }

            if (property === 'font-weight') {
                return /^(normal|bold|[1-9]00)$/.test(normalized) ? normalized : null;
            }

            if (property === 'font-style') {
                return ['normal', 'italic'].includes(normalized) ? normalized : null;
            }

            if (property === 'text-decoration') {
                return ['none', 'underline'].includes(normalized) ? normalized : null;
            }

            if (property === 'width' || property === 'max-width' || property === 'height') {
                return normalized === 'auto' || /^([0-9]{1,4})(px|%)$/.test(normalized) ? normalized : null;
            }

            if (property === 'display') {
                return ['block', 'inline-block', 'inline'].includes(normalized) ? normalized : null;
            }

            if (property === 'margin') {
                return /^(0|auto|0 auto|[0-9.]+(px|rem)\s+auto)$/.test(normalized) ? normalized : null;
            }

            if (property === 'border-radius') {
                return /^([0-9]{1,3})(px|%)$/.test(normalized) ? normalized : null;
            }

            return null;
        }

        function sanitizeStyleForTag(tagName, styleValue) {
            const allowedByTag = {
                P: ['text-align', 'font-size'],
                DIV: ['text-align', 'font-size', 'color'],
                H1: ['text-align', 'font-size', 'color'],
                H2: ['text-align', 'font-size', 'color'],
                H3: ['text-align', 'font-size', 'color'],
                H4: ['text-align', 'font-size', 'color'],
                BLOCKQUOTE: ['text-align', 'font-size', 'color'],
                FIGURE: ['text-align', 'font-size'],
                FIGCAPTION: ['text-align', 'font-size', 'color'],
                SPAN: ['font-size', 'font-weight', 'font-style', 'text-decoration', 'color'],
                IMG: ['width', 'max-width', 'height', 'display', 'margin', 'border-radius'],
            };

            return String(styleValue || '')
                .split(';')
                .map(function (declaration) {
                    return declaration.trim();
                })
                .filter(Boolean)
                .map(function (declaration) {
                    const separatorIndex = declaration.indexOf(':');

                    if (separatorIndex <= 0) {
                        return null;
                    }

                    const property = declaration.slice(0, separatorIndex).trim().toLowerCase();
                    const value = declaration.slice(separatorIndex + 1);
                    const allowedProperties = allowedByTag[tagName] || [];

                    if (!allowedProperties.includes(property)) {
                        return null;
                    }

                    const sanitizedValue = sanitizeCssValue(property, value);
                    return sanitizedValue ? property + ':' + sanitizedValue : null;
                })
                .filter(Boolean)
                .join('; ');
        }

        function isSafeRichUrl(value) {
            const normalized = String(value || '').trim();

            return normalized.startsWith('http://')
                || normalized.startsWith('https://')
                || normalized.startsWith('/')
                || normalized.startsWith('data:image/');
        }

        function sanitizeRichTextHtml(html) {
            const template = document.createElement('template');
            const allowedTags = new Set(['P', 'BR', 'DIV', 'SPAN', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'FIGURE', 'FIGCAPTION', 'IMG', 'HR']);
            const blockTags = new Set(['P', 'DIV', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'FIGURE', 'FIGCAPTION']);

            template.innerHTML = String(html || '');

            function sanitizeNode(node, ownerDocument) {
                if (node.nodeType === Node.TEXT_NODE) {
                    return ownerDocument.createTextNode(node.textContent || '');
                }

                if (node.nodeType !== Node.ELEMENT_NODE) {
                    return null;
                }

                const element = node;
                const tagName = element.tagName.toUpperCase();

                if (!allowedTags.has(tagName)) {
                    const fragment = ownerDocument.createDocumentFragment();
                    Array.from(element.childNodes).forEach(function (childNode) {
                        const sanitizedChild = sanitizeNode(childNode, ownerDocument);
                        if (sanitizedChild) {
                            fragment.appendChild(sanitizedChild);
                        }
                    });
                    return fragment;
                }

                const cleanElement = ownerDocument.createElement(tagName.toLowerCase());

                if (element.hasAttribute('style')) {
                    const styleValue = sanitizeStyleForTag(tagName, element.getAttribute('style') || '');
                    if (styleValue) {
                        cleanElement.setAttribute('style', styleValue);
                    }
                }

                if (tagName === 'IMG') {
                    const src = (element.getAttribute('src') || '').trim();
                    if (!isSafeRichUrl(src)) {
                        return null;
                    }

                    cleanElement.setAttribute('src', src);

                    const alt = (element.getAttribute('alt') || '').trim();
                    if (alt) {
                        cleanElement.setAttribute('alt', alt.slice(0, 160));
                    }
                }

                Array.from(element.childNodes).forEach(function (childNode) {
                    const sanitizedChild = sanitizeNode(childNode, ownerDocument);
                    if (sanitizedChild) {
                        cleanElement.appendChild(sanitizedChild);
                    }
                });

                if (blockTags.has(tagName) && cleanElement.childNodes.length === 0) {
                    cleanElement.appendChild(ownerDocument.createElement('br'));
                }

                return cleanElement;
            }

            const cleanWrapper = document.createElement('div');
            Array.from(template.content.childNodes).forEach(function (childNode) {
                const sanitizedChild = sanitizeNode(childNode, document);
                if (sanitizedChild) {
                    cleanWrapper.appendChild(sanitizedChild);
                }
            });

            return cleanWrapper.innerHTML.trim();
        }

        function syncRichDescriptionValue(options) {
            if (!richDescriptionTextarea || !richDescriptionEditor) {
                return;
            }

            const shouldRewriteEditor = options && options.rewriteEditor === true;
            const sanitizedHtml = sanitizeRichTextHtml(richDescriptionEditor.innerHTML);

            if (shouldRewriteEditor) {
                richDescriptionEditor.innerHTML = sanitizedHtml || '<p><br></p>';
            }

            richDescriptionTextarea.value = sanitizedHtml;
            if (richDescriptionPreview) {
                richDescriptionPreview.innerHTML = sanitizedHtml || '<p>-</p>';
            }
            bindRichDescriptionImageSelection();
            decorateRichDescriptionImages();
        }

        function focusRichDescriptionEditor() {
            if (!richDescriptionEditor) {
                return;
            }

            richDescriptionEditor.focus({ preventScroll: true });
        }

        function saveRichDescriptionSelection() {
            if (!richDescriptionEditor) {
                return;
            }

            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) {
                return;
            }

            const range = selection.getRangeAt(0);
            if (!richDescriptionEditor.contains(range.commonAncestorContainer)) {
                return;
            }

            lastRichDescriptionRange = range.cloneRange();
        }

        function restoreRichDescriptionSelection() {
            if (!lastRichDescriptionRange) {
                return false;
            }

            const selection = window.getSelection();
            if (!selection) {
                return false;
            }

            selection.removeAllRanges();
            selection.addRange(lastRichDescriptionRange.cloneRange());
            return true;
        }

        function rangeFragmentToHtml(range) {
            const wrapper = document.createElement('div');
            wrapper.appendChild(range.cloneContents());
            return wrapper.innerHTML;
        }

        function moveCaretInside(node) {
            const selection = window.getSelection();
            const range = document.createRange();

            range.selectNodeContents(node);
            range.collapse(false);

            if (!selection) {
                return;
            }

            selection.removeAllRanges();
            selection.addRange(range);
            saveRichDescriptionSelection();
        }

        function applyInlineRichTextStyle(styleMap) {
            if (!richDescriptionEditor) {
                return;
            }

            focusRichDescriptionEditor();
            restoreRichDescriptionSelection();

            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) {
                return;
            }

            const range = selection.getRangeAt(0);
            if (!richDescriptionEditor.contains(range.commonAncestorContainer)) {
                return;
            }

            const styleValue = Object.entries(styleMap)
                .map(function (entry) {
                    return entry[0] + ':' + entry[1];
                })
                .join('; ');

            if (range.collapsed) {
                const span = document.createElement('span');
                span.setAttribute('style', styleValue);
                span.textContent = '\u200b';
                range.insertNode(span);
                moveCaretInside(span);
                syncRichDescriptionValue({ rewriteEditor: true });
                return;
            }

            const selectedHtml = rangeFragmentToHtml(range);
            const html = '<span style="' + escapeHtml(styleValue) + '">' + selectedHtml + '</span>';
            document.execCommand('insertHTML', false, html);
            syncRichDescriptionValue({ rewriteEditor: true });
        }

        function clearSelectedRichDescriptionImage() {
            if (selectedRichDescriptionImage && selectedRichDescriptionImage.classList) {
                selectedRichDescriptionImage.classList.remove('is-selected');
            }

            selectedRichDescriptionImage = null;
        }

        function setSelectedRichDescriptionImage(imageNode) {
            clearSelectedRichDescriptionImage();

            if (!imageNode) {
                return;
            }

            selectedRichDescriptionImage = imageNode;
            selectedRichDescriptionImage.classList.add('is-selected');
            focusRichDescriptionEditor();
        }

        function bindRichDescriptionImageSelection() {
            if (!richDescriptionEditor) {
                return;
            }

            Array.from(richDescriptionEditor.querySelectorAll('img')).forEach(function (imageNode) {
                imageNode.addEventListener('click', function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    setSelectedRichDescriptionImage(imageNode);
                });
            });
        }

        function decorateRichDescriptionImages() {
            if (!richDescriptionEditor) {
                return;
            }

            richDescriptionEditor.querySelectorAll('.product-richtext-image-remove').forEach(function (buttonNode) {
                buttonNode.remove();
            });

            Array.from(richDescriptionEditor.querySelectorAll('img')).forEach(function (imageNode) {
                const wrapper = imageNode.closest('figure') || imageNode.parentElement;

                if (!wrapper || wrapper.querySelector('.product-richtext-image-remove')) {
                    return;
                }

                const removeButton = document.createElement('button');
                removeButton.type = 'button';
                removeButton.className = 'product-richtext-image-remove';
                removeButton.setAttribute('contenteditable', 'false');
                removeButton.setAttribute('aria-label', 'Remove image');
                removeButton.textContent = '×';
                removeButton.addEventListener('click', function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    setSelectedRichDescriptionImage(imageNode);
                    removeSelectedRichDescriptionImage();
                });

                wrapper.appendChild(removeButton);
            });
        }

        function applyRichTextCommand(command, value) {
            if (!richDescriptionEditor) {
                return;
            }

            focusRichDescriptionEditor();
            document.execCommand(command, false, value || null);
            syncRichDescriptionValue({ rewriteEditor: true });
        }

        function applyRichTextFontSize(size) {
            if (!richDescriptionEditor || !size) {
                return;
            }

            applyInlineRichTextStyle({
                'font-size': size,
            });
        }

        function insertRichTextImage(mode) {
            if (!richDescriptionEditor) {
                return;
            }

            const url = window.prompt(mode === 'icon'
                ? 'วาง URL ของ icon หรือรูปขนาดเล็ก'
                : 'วาง URL ของรูปภาพ');

            if (!url || !isSafeRichUrl(url)) {
                return;
            }

            const alt = window.prompt('คำอธิบายรูป (ไม่บังคับ)') || '';
            const widthStyle = mode === 'icon'
                ? 'width:96px; max-width:96px; max-height:96px;'
                : 'width:auto; max-width:100%; max-height:900px; object-fit:contain;';
            const html = '<figure style="text-align:center;">'
                + '<img src="' + escapeHtml(url.trim()) + '" alt="' + escapeHtml(alt.trim()) + '" style="display:block; margin:0 auto; ' + widthStyle + ' height:auto; border-radius:12px;">'
                + '</figure><p><br></p>';

            focusRichDescriptionEditor();
            document.execCommand('insertHTML', false, html);
            syncRichDescriptionValue({ rewriteEditor: true });
        }

        function insertRichTextIcon() {
            if (!richDescriptionEditor) {
                return;
            }

            const value = window.prompt('ใส่ emoji / ไอคอนตัวอักษร หรือปล่อยว่างเพื่อใช้ URL ของรูป');

            if (!value) {
                insertRichTextImage('icon');
                return;
            }

            const html = '<p style="text-align:center; font-size:32px;"><span style="font-size:32px;">'
                + escapeHtml(value.trim())
                + '</span></p><p><br></p>';

            focusRichDescriptionEditor();
            document.execCommand('insertHTML', false, html);
            syncRichDescriptionValue({ rewriteEditor: true });
        }

        function insertQuickRichTextIcon(icon) {
            if (!richDescriptionEditor || !icon) {
                return;
            }

            focusRichDescriptionEditor();
            restoreRichDescriptionSelection();
            document.execCommand(
                'insertHTML',
                false,
                '<span style="font-size:22px;">' + escapeHtml(icon) + '</span>&nbsp;'
            );
            syncRichDescriptionValue();
        }

        function openRichTextIconPicker() {
            if (!iconPickerBackdrop) {
                return;
            }

            saveRichDescriptionSelection();
            iconPickerBackdrop.classList.add('is-open');
            iconPickerBackdrop.setAttribute('aria-hidden', 'false');

            if (iconPickerSearch) {
                iconPickerSearch.value = '';
                window.setTimeout(function () {
                    iconPickerSearch.focus();
                }, 0);
            }

            renderRichTextIconPicker('');
        }

        function closeRichTextIconPicker() {
            if (!iconPickerBackdrop) {
                return;
            }

            iconPickerBackdrop.classList.remove('is-open');
            iconPickerBackdrop.setAttribute('aria-hidden', 'true');
            focusRichDescriptionEditor();
            restoreRichDescriptionSelection();
        }

        function renderRichTextIconPicker(keyword) {
            if (!iconPickerBody) {
                return;
            }

            const query = String(keyword || '').trim().toLowerCase();
            iconPickerBody.innerHTML = '';

            richTextIconCatalog.forEach(function (group) {
                const categoryMatch = group.category.toLowerCase().includes(query);
                const matchedIcons = group.icons.filter(function (icon) {
                    return categoryMatch || !query || icon.includes(query);
                });

                if (!matchedIcons.length) {
                    return;
                }

                const section = document.createElement('section');
                section.className = 'product-icon-picker-category';

                const title = document.createElement('h4');
                title.textContent = group.category;

                const grid = document.createElement('div');
                grid.className = 'product-icon-picker-grid';

                matchedIcons.forEach(function (icon) {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'product-icon-picker-option';
                    button.textContent = icon;
                    button.addEventListener('click', function () {
                        closeRichTextIconPicker();
                        insertQuickRichTextIcon(icon);
                    });
                    grid.appendChild(button);
                });

                section.appendChild(title);
                section.appendChild(grid);
                iconPickerBody.appendChild(section);
            });
        }

        function clearRichTextFormatting() {
            if (!richDescriptionEditor) {
                return;
            }

            focusRichDescriptionEditor();
            document.execCommand('removeFormat', false, null);
            syncRichDescriptionValue({ rewriteEditor: true });
        }

        function applyRichTextColor(color) {
            if (!richDescriptionEditor || !color) {
                return;
            }

            applyInlineRichTextStyle({
                color: color,
            });
        }

        async function uploadRichTextImage(file) {
            if (!richDescriptionEditor || !file) {
                return;
            }

            const preparedFile = await compressImageFile(file, {
                maxDimension: INLINE_RICH_IMAGE_MAX_DIMENSION,
                targetBytes: INLINE_RICH_IMAGE_TARGET_BYTES,
                mimeType: 'image/webp',
            });
            const reader = new FileReader();

            reader.onload = function (event) {
                const result = String(event.target && event.target.result ? event.target.result : '');
                if (!result.startsWith('data:image/')) {
                    return;
                }

                const html = '<figure style="text-align:center;">'
                    + '<img src="' + result + '" alt="' + escapeHtml(file.name || 'Uploaded image') + '" style="display:block; margin:0 auto; width:auto; max-width:100%; max-height:900px; height:auto; object-fit:contain; border-radius:12px;">'
                    + '</figure><p><br></p>';

                focusRichDescriptionEditor();
                document.execCommand('insertHTML', false, html);
                syncRichDescriptionValue({ rewriteEditor: true });
            };

            reader.readAsDataURL(preparedFile);
        }

        function removeSelectedRichDescriptionImage() {
            if (!selectedRichDescriptionImage || !selectedRichDescriptionImage.parentNode) {
                return;
            }

            const wrapper = selectedRichDescriptionImage.closest('figure');
            if (wrapper && wrapper.parentNode) {
                wrapper.parentNode.removeChild(wrapper);
            } else {
                selectedRichDescriptionImage.parentNode.removeChild(selectedRichDescriptionImage);
            }

            clearSelectedRichDescriptionImage();
            syncRichDescriptionValue({ rewriteEditor: true });
        }

        function removeAllRichDescriptionImages() {
            if (!richDescriptionEditor) {
                return;
            }

            richDescriptionEditor.querySelectorAll('figure').forEach(function (figureNode) {
                if (figureNode.querySelector('img')) {
                    figureNode.remove();
                }
            });

            richDescriptionEditor.querySelectorAll('img').forEach(function (imageNode) {
                if (imageNode.isConnected) {
                    imageNode.remove();
                }
            });

            clearSelectedRichDescriptionImage();
            syncRichDescriptionValue({ rewriteEditor: true });
        }

        function setupRichDescriptionEditor() {
            if (!richDescriptionTextarea || !richDescriptionEditor) {
                return;
            }

            const initialValue = String(richDescriptionTextarea.value || '');
            richDescriptionEditor.innerHTML = sanitizeRichTextHtml(
                looksLikeHtml(initialValue) ? initialValue : plainTextToEditorHtml(initialValue)
            ) || '<p><br></p>';

            richDescriptionEditor.addEventListener('input', function () {
                syncRichDescriptionValue({ rewriteEditor: false });
            });
            richDescriptionEditor.addEventListener('blur', function () {
                syncRichDescriptionValue({ rewriteEditor: false });
            });
            richDescriptionEditor.addEventListener('paste', function () {
                window.setTimeout(function () {
                    syncRichDescriptionValue({ rewriteEditor: false });
                }, 0);
            });
            ['keyup', 'mouseup', 'focus', 'input'].forEach(function (eventName) {
                richDescriptionEditor.addEventListener(eventName, function () {
                    saveRichDescriptionSelection();
                });
            });

            document.addEventListener('selectionchange', function () {
                saveRichDescriptionSelection();
            });

            const richToolbar = document.querySelector('[data-richtext-toolbar="product_description"]');
            if (richToolbar) {
                ['mousedown', 'touchstart'].forEach(function (eventName) {
                    richToolbar.addEventListener(eventName, function () {
                        saveRichDescriptionSelection();
                    });
                });

                richToolbar.addEventListener('mousedown', function (event) {
                    if (event.target.closest('button')) {
                        event.preventDefault();
                    }
                });
            }

            document.querySelectorAll('[data-richtext-command][data-editor-target="product_description"]').forEach(function (button) {
                button.addEventListener('click', function () {
                    const command = button.getAttribute('data-richtext-command');
                    const commandValue = button.getAttribute('data-command-value');
                    applyRichTextCommand(command, command === 'formatBlock' && commandValue ? '<' + commandValue + '>' : commandValue);
                });
            });

            const fontSizeSelect = document.querySelector('[data-richtext-font-size][data-editor-target="product_description"]');
            if (fontSizeSelect) {
                fontSizeSelect.addEventListener('change', function (event) {
                    const size = event.target.value;
                    if (size) {
                        applyRichTextFontSize(size);
                        event.target.value = '';
                    }
                });
            }

            const colorInput = document.querySelector('[data-richtext-color][data-editor-target="product_description"]');
            if (colorInput) {
                colorInput.addEventListener('input', function (event) {
                    applyRichTextColor(event.target.value);
                });
            }

            document.querySelectorAll('[data-richtext-quick-icon][data-editor-target="product_description"]').forEach(function (button) {
                button.addEventListener('click', function () {
                    insertQuickRichTextIcon(button.getAttribute('data-richtext-quick-icon') || '');
                });
            });

            const openIconPickerButton = document.querySelector('[data-richtext-open-icon-picker][data-editor-target="product_description"]');
            if (openIconPickerButton) {
                openIconPickerButton.addEventListener('click', function () {
                    openRichTextIconPicker();
                });
            }

            const insertImageButton = document.querySelector('[data-richtext-insert-image][data-editor-target="product_description"]');
            if (insertImageButton) {
                insertImageButton.addEventListener('click', function () {
                    insertRichTextImage('image');
                });
            }

            const uploadImageButton = document.querySelector('[data-richtext-upload-image][data-editor-target="product_description"]');
            const uploadImageInput = document.querySelector('[data-richtext-upload-input="product_description"]');
            if (uploadImageButton && uploadImageInput) {
                uploadImageButton.addEventListener('click', function () {
                    uploadImageInput.click();
                });

                uploadImageInput.addEventListener('change', function (event) {
                    const file = event.target.files && event.target.files[0];
                    if (file) {
                        uploadRichTextImage(file);
                    }
                    event.target.value = '';
                });
            }

            const removeSelectedImageButton = document.querySelector('[data-richtext-remove-selected-image][data-editor-target="product_description"]');
            if (removeSelectedImageButton) {
                removeSelectedImageButton.addEventListener('click', function () {
                    removeSelectedRichDescriptionImage();
                });
            }

            const removeAllImagesButton = document.querySelector('[data-richtext-remove-all-images][data-editor-target="product_description"]');
            if (removeAllImagesButton) {
                removeAllImagesButton.addEventListener('click', function () {
                    removeAllRichDescriptionImages();
                });
            }

            const insertIconButton = document.querySelector('[data-richtext-insert-icon][data-editor-target="product_description"]');
            if (insertIconButton) {
                insertIconButton.addEventListener('click', function () {
                    insertRichTextIcon();
                });
            }

            const clearButton = document.querySelector('[data-richtext-clear-format][data-editor-target="product_description"]');
            if (clearButton) {
                clearButton.addEventListener('click', function () {
                    clearRichTextFormatting();
                });
            }

            const refreshPreviewButton = document.querySelector('[data-richtext-refresh-preview="product_description"]');
            if (refreshPreviewButton) {
                refreshPreviewButton.addEventListener('click', function () {
                    syncRichDescriptionValue({ rewriteEditor: true });
                });
            }

            if (productForm) {
                productForm.addEventListener('submit', function () {
                    syncRichDescriptionValue({ rewriteEditor: true });
                });
            }

            if (iconPickerClose) {
                iconPickerClose.addEventListener('click', function () {
                    closeRichTextIconPicker();
                });
            }

            if (iconPickerBackdrop) {
                iconPickerBackdrop.addEventListener('click', function (event) {
                    if (event.target === iconPickerBackdrop) {
                        closeRichTextIconPicker();
                    }
                });
            }

            if (iconPickerSearch) {
                iconPickerSearch.addEventListener('input', function (event) {
                    renderRichTextIconPicker(event.target.value || '');
                });
            }

            document.addEventListener('keydown', function (event) {
                if (event.key === 'Escape' && iconPickerBackdrop && iconPickerBackdrop.classList.contains('is-open')) {
                    closeRichTextIconPicker();
                }
            });

            richDescriptionEditor.addEventListener('click', function (event) {
                if (event.target === richDescriptionEditor) {
                    clearSelectedRichDescriptionImage();
                }
            });

            richDescriptionEditor.addEventListener('keydown', function (event) {
                if ((event.key === 'Backspace' || event.key === 'Delete') && selectedRichDescriptionImage) {
                    event.preventDefault();
                    removeSelectedRichDescriptionImage();
                }
            });

            syncRichDescriptionValue({ rewriteEditor: true });
        }

        supplierSelect.addEventListener('change', function () {
            syncCategoryOptions();
            syncProductFamilyOptions();
            applyProductFamilyMetadata();
            syncFamilyInputMode();
            syncDetailCodeSuggestion(false);
            syncFirmState();
        });

        categorySelect.addEventListener('change', function () {
            syncProductFamilyOptions();
            applyProductFamilyMetadata();
            syncFamilyInputMode();
            syncDetailCodeSuggestion(false);
            syncFirmState();
        });

        productFamilySelect.addEventListener('change', function () {
            syncSelectorsFromProductFamily();
            syncProductFamilyOptions();
            applyProductFamilyMetadata();
            syncFamilyInputMode();
            syncDetailCodeSuggestion(false);
            syncFirmState();
        });

        youtubeInput.addEventListener('input', updateYoutubePreview);
        costPriceInput.addEventListener('input', syncPvState);
        memberPriceInput.addEventListener('input', syncPvState);
        costPriceInput.addEventListener('input', syncDcwState);
        memberPriceInput.addEventListener('input', syncDcwState);
        costPriceInput.addEventListener('input', syncFirmState);
        memberPriceInput.addEventListener('input', syncFirmState);
        pvManualOverrideInput.addEventListener('change', syncPvState);
        dcwManualOverrideInput.addEventListener('change', syncDcwState);
        firmEnabledInput.addEventListener('change', syncFirmState);
        if (firmOverrideInput) {
            firmOverrideInput.addEventListener('change', syncFirmState);
        }

        if (firmAmountPaidInput) {
            firmAmountPaidInput.addEventListener('input', function () {
                memberPriceInput.value = firmAmountPaidInput.value || '0';
                syncPvState();
                syncDcwState();
                syncFirmState();
            });
        }

        galleryFilesInput.addEventListener('change', async function () {
            const compressedFiles = await compressImageFiles(
                Array.from(galleryFilesInput.files || []),
                {
                    maxDimension: IMAGE_MAX_DIMENSION,
                    targetBytes: GALLERY_TARGET_BYTES,
                    mimeType: 'image/webp',
                }
            );
            appendGalleryFiles(compressedFiles);
            updateGalleryPreview();
        });
        if (homeCardFileInput) {
            homeCardFileInput.addEventListener('change', async function () {
                const file = Array.from(homeCardFileInput.files || []).find(function (entry) {
                    return entry.type.startsWith('image/');
                }) || null;

                await setSingleInputFile(homeCardFileInput, file, {
                    maxDimension: IMAGE_MAX_DIMENSION,
                    targetBytes: HOME_CARD_TARGET_BYTES,
                    mimeType: 'image/webp',
                });
                updateHomeCardPreview();
            });
        }

        constrainedInputs.forEach(function (input) {
            ['input', 'change', 'blur', 'invalid'].forEach(function (eventName) {
                input.addEventListener(eventName, function () {
                    syncInputValidityState(input);
                });
            });

            syncInputValidityState(input);
        });

        dropzone.addEventListener('click', function () {
            galleryFilesInput.click();
        });

        dropzone.addEventListener('dragover', function (event) {
            event.preventDefault();
            dropzone.classList.add('is-dragging');
        });

        dropzone.addEventListener('dragleave', function () {
            dropzone.classList.remove('is-dragging');
        });

        dropzone.addEventListener('drop', async function (event) {
            event.preventDefault();
            dropzone.classList.remove('is-dragging');
            const files = Array.from(event.dataTransfer?.files || []).filter(function (file) {
                return file.type.startsWith('image/');
            }).slice(0, 10);
            if (files.length > 0) {
                appendGalleryFiles(await compressImageFiles(files, {
                    maxDimension: IMAGE_MAX_DIMENSION,
                    targetBytes: GALLERY_TARGET_BYTES,
                    mimeType: 'image/webp',
                }));
                updateGalleryPreview();
            }
        });

        dropzone.addEventListener('paste', async function (event) {
            const files = Array.from(event.clipboardData?.items || []).filter(function (entry) {
                return entry.type.startsWith('image/');
            }).map(function (entry) {
                return entry.getAsFile();
            }).filter(Boolean).slice(0, 10);

            if (files.length === 0) {
                return;
            }

            appendGalleryFiles(await compressImageFiles(files, {
                maxDimension: IMAGE_MAX_DIMENSION,
                targetBytes: GALLERY_TARGET_BYTES,
                mimeType: 'image/webp',
            }));
            updateGalleryPreview();
        });

        syncCategoryOptions();
        syncProductFamilyOptions();
        syncSelectorsFromProductFamily();
        applyProductFamilyMetadata();
        syncFamilyInputMode();
        syncDetailCodeSuggestion(false);
        updateYoutubePreview();
        syncExistingGalleryInputs();
        updateGalleryPreview();
        updateHomeCardPreview();
        syncPvState();
        syncDcwState();
        syncFirmState();
        setupRichDescriptionEditor();

        if (firstErrorInput) {
            firstErrorInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstErrorInput.focus({ preventScroll: true });
        }
    })();
</script>
