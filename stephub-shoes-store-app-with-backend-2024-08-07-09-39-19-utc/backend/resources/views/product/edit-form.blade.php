@php
    $product = $product ?? [];
    $productOptions = $productOptions ?? [];
    $productMetadata = $productMetadata ?? [];
    $supplierOptions = $supplierOptions ?? [];
    $categoryOptions = $categoryOptions ?? [];
    $youtubeEmbedUrl = $youtubeEmbedUrl ?? null;
    $imagePreviewUrl = $imagePreviewUrl ?? null;
    $galleryUrls = array_pad(array_slice($product['gallery_urls'] ?? [], 0, 9), 9, '');
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

    .product-pv-warning {
        margin-top: 0.5rem;
        padding: 0.75rem 0.9rem;
        border-radius: 10px;
        background: #fff7ed;
        border: 1px solid #fdba74;
        color: #9a3412;
        font-size: 0.9rem;
    }

    @media (max-width: 900px) {
        .product-media-shell {
            grid-template-columns: 1fr;
        }
    }
</style>

<div class="pool-block">
    <h3>Product detail</h3>

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
            <select id="product_product_id" name="product[product_id]" required>
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
            <div class="pool-note">เลือก supplier และ category เพื่อกรอง product family ให้ตรงข้อมูลมากขึ้น</div>
        </div>

        <div class="pool-field">
            <label for="product_code">Detail code</label>
            <input id="product_code" name="product[code]" value="{{ old('product.code', $product['code'] ?? '') }}" required>
        </div>

        <div class="pool-field">
            <label for="product_name">Detail name</label>
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
            <input id="product_family_code" value="{{ $product['product_code'] ?? '' }}" readonly>
        </div>

        <div class="pool-field">
            <label for="product_family_name">Product family name</label>
            <input id="product_family_name" value="{{ $product['product_name'] ?? '' }}" readonly>
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

            <div class="pool-field">
                <label for="product_image_url">Image URL</label>
                <input
                    id="product_image_url"
                    name="product[image_url]"
                    type="text"
                    placeholder="https://... or products/your-image.jpg"
                    value="{{ old('product.image_url', $product['image_url'] ?? '') }}"
                >
                <div class="pool-note">วางลิงก์รูปได้ หรือจะเลือกไฟล์ / ลากไฟล์มาวางด้านล่างก็ได้ โดยระบบจะส่งไฟล์จริงแทนการแปลงเป็น base64 ก้อนใหญ่</div>
            </div>

            <div class="pool-field">
                <label for="product_image_file">Upload image</label>
                <input id="product_image_file" name="product[image_file]" type="file" accept="image/*">
            </div>

            <div class="product-dropzone" id="productDropzone" tabindex="0">
                <strong>Drop image here</strong>
                <span>Click to choose, drag and drop, or paste an image from clipboard</span>
            </div>

            <div class="pool-field">
                <label for="product_gallery_files">Gallery images</label>
                <input id="product_gallery_files" name="product[gallery_files][]" type="file" accept="image/*" multiple>
                <div class="pool-note">เพิ่มรูปเสริมได้อีกสูงสุด 9 รูป รวมรูปหลักแล้วไม่เกิน 10 รูป</div>
            </div>

            <div class="product-gallery-grid">
                @foreach ($galleryUrls as $index => $galleryUrl)
                    <div class="pool-field">
                        <label for="product_gallery_url_{{ $index + 1 }}">Gallery URL {{ $index + 1 }}</label>
                        <input
                            id="product_gallery_url_{{ $index + 1 }}"
                            name="product[gallery_urls][]"
                            type="text"
                            placeholder="https://... or products/gallery-image.jpg"
                            value="{{ $galleryUrl }}"
                        >
                    </div>
                @endforeach
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
        <div class="pool-field">
            <label for="product_cost_price">Cost price</label>
            <input id="product_cost_price" name="product[cost_price]" type="number" step="0.00000001" min="0" value="{{ old('product.cost_price', $product['cost_price'] ?? '0') }}">
        </div>

        <div class="pool-field">
            <label for="product_member_price">Member price</label>
            <input id="product_member_price" name="product[member_price]" type="number" step="0.00000001" min="0" value="{{ old('product.member_price', $product['member_price'] ?? '0') }}">
        </div>

        <div class="pool-field">
            <label for="product_retail_price">Retail price</label>
            <input id="product_retail_price" name="product[retail_price]" type="number" step="0.00000001" min="0" value="{{ old('product.retail_price', $product['retail_price'] ?? '0') }}">
        </div>

        <div class="pool-field">
            <label for="product_pv">PV</label>
            <input id="product_pv" name="product[pv]" type="number" step="0.00000001" min="0" value="{{ old('product.pv', $product['pv'] ?? '0') }}">
            <div class="pool-note">
                ค่าเริ่มต้นคำนวณจากสูตร `(ราคาสมาชิก - ต้นทุน) x 80%`
                ได้ <strong id="productPvFormulaValue">{{ $product['pv_formula'] ?? '0.00000000' }}</strong>
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

        <div class="pool-field">
            <label for="product_pool_rate">Pool rate</label>
            <input id="product_pool_rate" name="product[pool_rate]" type="number" step="0.00000001" min="0" value="{{ old('product.pool_rate', $product['pool_rate'] ?? '0') }}">
        </div>
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
        const productFamilyCode = document.getElementById('product_family_code');
        const productFamilyName = document.getElementById('product_family_name');
        const productCategoryName = document.getElementById('product_category_name');
        const productSupplierName = document.getElementById('product_supplier_name');
        const fileInput = document.getElementById('product_image_file');
        const galleryFilesInput = document.getElementById('product_gallery_files');
        const galleryUrlInputs = Array.from(document.querySelectorAll('input[name="product[gallery_urls][]"]'));
        const imageUrlInput = document.getElementById('product_image_url');
        const youtubeInput = document.getElementById('product_youtube_url');
        const imagePreview = document.getElementById('productImagePreview');
        const galleryPreview = document.getElementById('productGalleryPreview');
        const youtubeCard = document.getElementById('productYoutubeCard');
        const youtubeFrame = document.getElementById('productYoutubeFrame');
        const dropzone = document.getElementById('productDropzone');
        const costPriceInput = document.getElementById('product_cost_price');
        const memberPriceInput = document.getElementById('product_member_price');
        const pvInput = document.getElementById('product_pv');
        const pvManualOverrideInput = document.getElementById('product_pv_manual_override');
        const pvFormulaValue = document.getElementById('productPvFormulaValue');
        const pvWarning = document.getElementById('productPvWarning');
        const fallbackImage = imagePreview.getAttribute('src');
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

        function updateGalleryPreview() {
            const urls = galleryUrlInputs
                .map(function (input) {
                    return resolveImagePreviewUrl(input.value);
                })
                .filter(Boolean);
            const fileUrls = Array.from(galleryFilesInput.files || [])
                .filter(function (file) {
                    return file.type.startsWith('image/');
                })
                .map(function (file) {
                    return URL.createObjectURL(file);
                });
            const allUrls = urls.concat(fileUrls).slice(0, 9);

            galleryPreview.innerHTML = '';

            allUrls.forEach(function (url, index) {
                const shell = document.createElement('div');
                shell.className = 'product-gallery-thumb';

                const img = document.createElement('img');
                img.src = url;
                img.alt = `Gallery image ${index + 1}`;

                shell.appendChild(img);
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

        function applyFile(file) {
            if (!file || !file.type.startsWith('image/')) {
                return;
            }

            const previewUrl = URL.createObjectURL(file);
            updateImagePreview(previewUrl);
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

        imageUrlInput.addEventListener('input', function () {
            updateImagePreview(imageUrlInput.value.trim());
        });

        galleryUrlInputs.forEach(function (input) {
            input.addEventListener('input', updateGalleryPreview);
        });

        supplierSelect.addEventListener('change', function () {
            syncCategoryOptions();
            syncProductFamilyOptions();
            applyProductFamilyMetadata();
        });

        categorySelect.addEventListener('change', function () {
            syncProductFamilyOptions();
            applyProductFamilyMetadata();
        });

        productFamilySelect.addEventListener('change', function () {
            syncSelectorsFromProductFamily();
            syncProductFamilyOptions();
            applyProductFamilyMetadata();
        });

        youtubeInput.addEventListener('input', updateYoutubePreview);
        costPriceInput.addEventListener('input', syncPvState);
        memberPriceInput.addEventListener('input', syncPvState);
        pvManualOverrideInput.addEventListener('change', syncPvState);

        fileInput.addEventListener('change', function () {
            applyFile(fileInput.files?.[0]);
        });

        galleryFilesInput.addEventListener('change', updateGalleryPreview);

        dropzone.addEventListener('click', function () {
            fileInput.click();
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
            const file = event.dataTransfer?.files?.[0];
            if (file) {
                const transfer = new DataTransfer();
                transfer.items.add(file);
                fileInput.files = transfer.files;
                applyFile(file);
            }
        });

        dropzone.addEventListener('paste', function (event) {
            const item = Array.from(event.clipboardData?.items || []).find(function (entry) {
                return entry.type.startsWith('image/');
            });
            if (!item) {
                return;
            }
            const file = item.getAsFile();
            if (!file) {
                return;
            }
            const transfer = new DataTransfer();
            transfer.items.add(file);
            fileInput.files = transfer.files;
            applyFile(file);
        });

        syncCategoryOptions();
        syncProductFamilyOptions();
        syncSelectorsFromProductFamily();
        applyProductFamilyMetadata();
        updateYoutubePreview();
        updateImagePreview(imageUrlInput.value.trim());
        updateGalleryPreview();
        syncPvState();
    })();
</script>
