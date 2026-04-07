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
    }

    .product-gallery-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
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

    @media (max-width: 900px) {
        .product-media-shell {
            grid-template-columns: 1fr;
        }
    }
</style>

<div class="pool-block">
    <h3>SKU / Product detail</h3>

    <div class="pool-grid">
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
        <textarea id="product_description" name="product[description]">{{ old('product.description', $product['description'] ?? '') }}</textarea>
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

    <div class="product-firm-mode" id="productFirmModeSummary" @if ((string) ($product['firm_enabled'] ?? '0') !== '1') style="display:none" @endif>
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
        const firstErrorInput = document.querySelector('.pool-input-error');
        const fallbackImage = imagePreview.getAttribute('src');
        const fallbackHomeCardImage = homeCardPreview.getAttribute('src');
        const constrainedInputs = Array.from(document.querySelectorAll('input[max], input[min], input[required], select[required], textarea[required]'));
        let retainedExistingImageUrls = existingImageUrls.slice(0, 10);
        let selectedGalleryFiles = Array.from(galleryFilesInput.files || []).filter(function (file) {
            return file.type.startsWith('image/');
        }).slice(0, 10);
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
            return [file.name, file.size, file.lastModified, file.type].join('::');
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
        }

        function removeGalleryFile(index) {
            selectedGalleryFiles = selectedGalleryFiles.filter(function (_, fileIndex) {
                return fileIndex !== index;
            });

            syncGalleryFilesInput();
            updateGalleryPreview();
        }

        function removeExistingGalleryImage(index) {
            retainedExistingImageUrls = retainedExistingImageUrls.filter(function (_, imageIndex) {
                return imageIndex !== index;
            });

            syncExistingGalleryInputs();
            updateGalleryPreview();
        }

        function galleryPreviewItems() {
            const uploadedItems = selectedGalleryFiles.map(function (file, index) {
                return {
                    type: 'upload',
                    index: index,
                    url: URL.createObjectURL(file),
                };
            });
            const existingItems = retainedExistingImageUrls.map(function (url, index) {
                return {
                    type: 'existing',
                    index: index,
                    url: resolveImagePreviewUrl(url),
                };
            }).filter(function (item) {
                return Boolean(item.url);
            });

            return uploadedItems.concat(existingItems).slice(0, 10);
        }

        function updateGalleryPreview() {
            const items = galleryPreviewItems();

            galleryPreview.innerHTML = '';

            updateImagePreview(items[0]?.url || '');

            items.forEach(function (item, index) {
                const shell = document.createElement('div');
                shell.className = 'product-gallery-thumb';

                const img = document.createElement('img');
                img.src = item.url;
                img.alt = `Gallery image ${index + 1}`;

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

                shell.appendChild(img);
                shell.appendChild(removeButton);
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

        galleryFilesInput.addEventListener('change', function () {
            appendGalleryFiles(Array.from(galleryFilesInput.files || []));
            updateGalleryPreview();
        });
        if (homeCardFileInput) {
            homeCardFileInput.addEventListener('change', updateHomeCardPreview);
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

        dropzone.addEventListener('drop', function (event) {
            event.preventDefault();
            dropzone.classList.remove('is-dragging');
            const files = Array.from(event.dataTransfer?.files || []).filter(function (file) {
                return file.type.startsWith('image/');
            }).slice(0, 10);
            if (files.length > 0) {
                appendGalleryFiles(files);
                updateGalleryPreview();
            }
        });

        dropzone.addEventListener('paste', function (event) {
            const files = Array.from(event.clipboardData?.items || []).filter(function (entry) {
                return entry.type.startsWith('image/');
            }).map(function (entry) {
                return entry.getAsFile();
            }).filter(Boolean).slice(0, 10);

            if (files.length === 0) {
                return;
            }

            appendGalleryFiles(files);
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

        if (firstErrorInput) {
            firstErrorInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstErrorInput.focus({ preventScroll: true });
        }
    })();
</script>
