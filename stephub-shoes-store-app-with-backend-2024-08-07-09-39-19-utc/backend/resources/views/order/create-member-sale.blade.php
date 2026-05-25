@php
    /** @var array<string, mixed> $sale */
    $sale = $sale ?? [];
    $memberDirectory = collect($memberDirectory ?? []);
    $productCatalog = collect($productCatalog ?? []);
    $topProducts = collect($topProducts ?? []);
@endphp

<style>
    .member-sale-page { display:grid; gap:1.25rem; }
    .member-sale-card { background:#fff; border:1px solid #e5e7eb; border-radius:16px; padding:1.25rem; box-shadow:0 8px 24px rgba(15,23,42,.05); }
    .member-sale-grid { display:grid; gap:1rem; }
    .member-sale-grid.two { grid-template-columns:repeat(2,minmax(0,1fr)); }
    .member-sale-grid.three { grid-template-columns:repeat(3,minmax(0,1fr)); }
    .member-sale-label { display:block; font-weight:600; margin-bottom:.4rem; color:#0f172a; }
    .member-sale-input, .member-sale-select, .member-sale-textarea { width:100%; border:1px solid #cbd5e1; border-radius:12px; padding:.78rem .9rem; background:#fff; }
    .member-sale-textarea { min-height:88px; resize:vertical; }
    .member-sale-meta { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.9rem; }
    .member-sale-meta-box { border:1px dashed #cbd5e1; border-radius:14px; padding:.85rem 1rem; background:#f8fafc; }
    .member-sale-meta-box strong { display:block; color:#0f172a; font-size:.78rem; margin-bottom:.2rem; }
    .member-sale-search-results { margin-top:.75rem; border:1px solid #e2e8f0; border-radius:14px; overflow:hidden; background:#fff; max-height:320px; overflow-y:auto; }
    .member-sale-result { width:100%; text-align:left; border:0; border-bottom:1px solid #e2e8f0; background:#fff; padding:.85rem 1rem; cursor:pointer; }
    .member-sale-result:last-child { border-bottom:0; }
    .member-sale-result:hover { background:#f8fafc; }
    .member-sale-products-strip { display:flex; gap:1rem; overflow-x:auto; padding-bottom:.25rem; }
    .member-sale-product-card { min-width:220px; max-width:220px; border:1px solid #e2e8f0; border-radius:16px; background:#fff; overflow:hidden; }
    .member-sale-product-image { aspect-ratio:1 / 1; background:#f8fafc center / contain no-repeat; border-bottom:1px solid #e2e8f0; }
    .member-sale-product-body { padding:.9rem; display:grid; gap:.5rem; }
    .member-sale-product-name { font-weight:700; color:#0f172a; line-height:1.35; min-height:2.8em; }
    .member-sale-product-meta { font-size:.86rem; color:#475569; }
    .member-sale-product-action { border:0; border-radius:10px; padding:.7rem .9rem; background:#1d4ed8; color:#fff; font-weight:700; cursor:pointer; }
    .member-sale-selected-list { display:grid; gap:.75rem; }
    .member-sale-selected-item { display:grid; grid-template-columns:minmax(0,1fr) 110px 110px; gap:.75rem; align-items:center; border:1px solid #e2e8f0; border-radius:14px; padding:.85rem 1rem; background:#fff; }
    .member-sale-selected-item button { border:0; border-radius:10px; padding:.65rem .8rem; background:#fee2e2; color:#b91c1c; font-weight:700; cursor:pointer; }
    .member-sale-toggle { display:flex; gap:.75rem; flex-wrap:wrap; }
    .member-sale-toggle label { display:flex; align-items:center; gap:.45rem; padding:.7rem .9rem; border:1px solid #cbd5e1; border-radius:12px; background:#fff; cursor:pointer; }
    .member-sale-address-box { border:1px solid #dbeafe; background:#eff6ff; color:#1e3a8a; border-radius:14px; padding:1rem; }
    .member-sale-section-title { font-size:1rem; font-weight:800; color:#0f172a; margin-bottom:.75rem; }
    .member-sale-note { color:#64748b; font-size:.9rem; }
    .member-sale-hidden { display:none !important; }
    .member-sale-payment-grid { display:grid; gap:.75rem; grid-template-columns:repeat(5,minmax(0,1fr)); }
    .member-sale-payment-grid label { display:flex; align-items:center; gap:.55rem; padding:.9rem 1rem; border:1px solid #cbd5e1; border-radius:14px; cursor:pointer; background:#fff; font-weight:600; }
    .member-sale-summary-box { border:1px solid #dbeafe; background:#eff6ff; color:#1e3a8a; border-radius:14px; padding:1rem; }
    @media (max-width: 960px) {
        .member-sale-grid.two, .member-sale-grid.three, .member-sale-meta, .member-sale-selected-item, .member-sale-payment-grid { grid-template-columns:1fr; }
    }
</style>

<div class="member-sale-page"
     data-member-directory='@json($memberDirectory, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)'
     data-product-catalog='@json($productCatalog, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)'
     data-top-products='@json($topProducts, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)'>

    <input type="hidden" name="sale[workflow_mode]" value="{{ old('sale.workflow_mode', $sale['workflow_mode'] ?? 'approve_and_process') }}">
    <input type="hidden" name="sale[discount_wallet_amount]" id="sale_discount_wallet_amount" value="{{ old('sale.discount_wallet_amount', $sale['discount_wallet_amount'] ?? '0') }}">
    <input type="hidden" name="sale[shopping_wallet_amount]" id="sale_shopping_wallet_amount" value="{{ old('sale.shopping_wallet_amount', $sale['shopping_wallet_amount'] ?? '0') }}">
    <input type="hidden" name="sale[firm_wallet_amount]" id="sale_firm_wallet_amount" value="{{ old('sale.firm_wallet_amount', $sale['firm_wallet_amount'] ?? '0') }}">
    <input type="hidden" name="sale[cash_payment_method]" id="sale_cash_payment_method" value="{{ old('sale.cash_payment_method', $sale['cash_payment_method'] ?? 'cash') }}">
    <input type="hidden" name="sale[save_as_default]" value="{{ old('sale.save_as_default', $sale['save_as_default'] ?? false) ? '1' : '0' }}">
    <input type="hidden" name="sale[existing_shipping_address_id]" id="sale_existing_shipping_address_id" value="{{ old('sale.existing_shipping_address_id', $sale['existing_shipping_address_id'] ?? '') }}">
    <input type="hidden" name="sale[change_shipping_address]" id="sale_change_shipping_address" value="{{ old('sale.change_shipping_address', $sale['change_shipping_address'] ?? false) ? '1' : '0' }}">

    <div class="member-sale-card">
        <div class="member-sale-grid">
            <div>
                <label class="member-sale-label" for="member_sale_member_search">รหัสสมาชิก</label>
                <input
                    id="member_sale_member_search"
                    class="member-sale-input"
                    type="text"
                    placeholder="พิมพ์รหัสสมาชิกหรือชื่อสมาชิก"
                    value="{{ old('sale.member_lookup', '') }}"
                    autocomplete="off"
                >
                <input type="hidden" name="sale[member_id]" id="member_sale_member_id" value="{{ old('sale.member_id', $sale['member_id'] ?? '') }}">
                @error('sale.member_id')
                    <div class="text-danger mt-2">{{ $message }}</div>
                @enderror
                <div class="member-sale-search-results member-sale-hidden" id="memberSaleMemberResults"></div>
            </div>

            <div class="member-sale-meta">
                <div class="member-sale-meta-box">
                    <strong>วันที่</strong>
                    <span>{{ $todayLabel ?? now()->format('d/m/Y H:i') }}</span>
                </div>
                <div class="member-sale-meta-box">
                    <strong>เลขที่ออเดอร์</strong>
                    <span>{{ $orderPreviewNo ?? 'AUTO' }}</span>
                </div>
                <div class="member-sale-meta-box">
                    <strong>สมาชิกที่เลือก</strong>
                    <span id="memberSaleSelectedMemberLabel">ยังไม่ได้เลือก</span>
                </div>
            </div>
        </div>
    </div>

    <div class="member-sale-card">
        <div class="member-sale-section-title">เลือกสินค้า</div>
        <div>
            <label class="member-sale-label" for="member_sale_product_search">ค้นหาสินค้า</label>
            <input
                id="member_sale_product_search"
                class="member-sale-input"
                type="text"
                placeholder="พิมพ์ชื่อสินค้าแล้วเลือกจากรายการ"
                autocomplete="off"
            >
            <div class="member-sale-search-results member-sale-hidden" id="memberSaleProductResults"></div>
        </div>

        <div class="mt-3">
            <div class="member-sale-section-title" id="memberSaleProductStripTitle">สินค้าขายดี</div>
            <div class="member-sale-products-strip" id="memberSaleProductStrip"></div>
        </div>

        <div class="mt-4">
            <div class="member-sale-section-title">สินค้าที่เลือก</div>
            <div class="member-sale-selected-list" id="memberSaleSelectedItems"></div>
            @error('sale.items')
                <div class="text-danger mt-2">{{ $message }}</div>
            @enderror
        </div>
    </div>

    <div class="member-sale-card">
        <div class="member-sale-section-title">ช่องทางจัดส่ง</div>
        <div class="member-sale-toggle">
            <label>
                <input type="radio" name="sale[fulfillment_method]" value="branch_pickup" @checked(old('sale.fulfillment_method', $sale['fulfillment_method'] ?? 'branch_pickup') === 'branch_pickup')>
                รับที่สาขา
            </label>
            <label>
                <input type="radio" name="sale[fulfillment_method]" value="delivery" @checked(old('sale.fulfillment_method', $sale['fulfillment_method'] ?? 'branch_pickup') === 'delivery')>
                จัดส่ง
            </label>
        </div>
    </div>

    <div class="member-sale-card">
        <div class="member-sale-section-title">ช่องทางชำระเงิน</div>
        <div class="member-sale-payment-grid">
            <label>
                <input type="radio" name="sale[payment_channel]" value="cash" @checked(old('sale.payment_channel', $sale['payment_channel'] ?? 'cash') === 'cash')>
                เงินสด
            </label>
            <label>
                <input type="radio" name="sale[payment_channel]" value="bank_transfer" @checked(old('sale.payment_channel', $sale['payment_channel'] ?? 'cash') === 'bank_transfer')>
                เงินโอน
            </label>
            <label>
                <input type="radio" name="sale[payment_channel]" value="shopping_wallet" @checked(old('sale.payment_channel', $sale['payment_channel'] ?? 'cash') === 'shopping_wallet')>
                SW
            </label>
            <label>
                <input type="radio" name="sale[payment_channel]" value="other" @checked(old('sale.payment_channel', $sale['payment_channel'] ?? 'cash') === 'other')>
                อื่นๆ
            </label>
        </div>
        @error('sale.payment_channel')
            <div class="text-danger mt-2">{{ $message }}</div>
        @enderror
        <div class="member-sale-summary-box mt-3" id="memberSalePaymentSummary">
            ยอดรวมสินค้า 0.00 บาท
        </div>
    </div>

    <div class="member-sale-card" id="memberSalePickupSection">
        <div class="member-sale-section-title">ข้อมูลรับที่สาขา</div>
        <div class="member-sale-grid two">
            <div>
                <label class="member-sale-label" for="sale_pickup_branch_name">ชื่อสาขา / จุดรับสินค้า</label>
                <input id="sale_pickup_branch_name" class="member-sale-input" name="sale[pickup_branch_name]" value="{{ old('sale.pickup_branch_name', $sale['pickup_branch_name'] ?? '') }}" placeholder="Head Office / Counter A">
                @error('sale.pickup_branch_name')<div class="text-danger mt-2">{{ $message }}</div>@enderror
            </div>
            <div>
                <label class="member-sale-label" for="sale_pickup_recipient_name">ชื่อผู้รับ</label>
                <input id="sale_pickup_recipient_name" class="member-sale-input" name="sale[pickup_recipient_name]" value="{{ old('sale.pickup_recipient_name', $sale['pickup_recipient_name'] ?? '') }}">
            </div>
            <div>
                <label class="member-sale-label" for="sale_pickup_phone">โทรศัพท์</label>
                <input id="sale_pickup_phone" class="member-sale-input" name="sale[pickup_phone]" value="{{ old('sale.pickup_phone', $sale['pickup_phone'] ?? '') }}">
            </div>
            <div>
                <label class="member-sale-label" for="sale_pickup_email">อีเมล</label>
                <input id="sale_pickup_email" class="member-sale-input" name="sale[pickup_email]" value="{{ old('sale.pickup_email', $sale['pickup_email'] ?? '') }}">
            </div>
        </div>
        <div class="mt-3">
            <label class="member-sale-label" for="sale_pickup_branch_note">หมายเหตุ</label>
            <textarea id="sale_pickup_branch_note" class="member-sale-textarea" name="sale[pickup_branch_note]">{{ old('sale.pickup_branch_note', $sale['pickup_branch_note'] ?? '') }}</textarea>
        </div>
    </div>

    <div class="member-sale-card member-sale-hidden" id="memberSaleDeliverySection">
        <div class="member-sale-section-title">ข้อมูลจัดส่ง</div>
        <div class="member-sale-address-box member-sale-hidden" id="memberSaleDefaultAddressBox"></div>
        <div class="mt-3">
            <button class="btn btn-default" type="button" id="memberSaleToggleAddressChange">เปลี่ยนที่อยู่จัดส่ง</button>
        </div>

        <div class="member-sale-grid two mt-3" id="memberSaleAddressForm">
            <div>
                <label class="member-sale-label" for="sale_recipient_name">ชื่อผู้รับ</label>
                <input id="sale_recipient_name" class="member-sale-input" name="sale[recipient_name]" value="{{ old('sale.recipient_name', $sale['recipient_name'] ?? '') }}">
            </div>
            <div>
                <label class="member-sale-label" for="sale_phone">โทรศัพท์ผู้รับ</label>
                <input id="sale_phone" class="member-sale-input" name="sale[phone]" value="{{ old('sale.phone', $sale['phone'] ?? '') }}">
            </div>
            <div>
                <label class="member-sale-label" for="sale_email">อีเมลผู้รับ</label>
                <input id="sale_email" class="member-sale-input" name="sale[email]" value="{{ old('sale.email', $sale['email'] ?? '') }}">
            </div>
            <div>
                <label class="member-sale-label" for="sale_label">ป้ายที่อยู่</label>
                <input id="sale_label" class="member-sale-input" name="sale[label]" value="{{ old('sale.label', $sale['label'] ?? 'Admin sale address') }}">
            </div>
            <div>
                <label class="member-sale-label" for="sale_country_name">ประเทศ</label>
                <input id="sale_country_name" class="member-sale-input" name="sale[country_name]" value="{{ old('sale.country_name', $sale['country_name'] ?? 'Thailand') }}">
            </div>
            <div>
                <label class="member-sale-label" for="sale_country_code">Country code</label>
                <input id="sale_country_code" class="member-sale-input" name="sale[country_code]" value="{{ old('sale.country_code', $sale['country_code'] ?? 'TH') }}">
            </div>
            <div>
                <label class="member-sale-label" for="sale_province_name">จังหวัด</label>
                <input id="sale_province_name" class="member-sale-input" name="sale[province_name]" value="{{ old('sale.province_name', $sale['province_name'] ?? '') }}">
            </div>
            <div>
                <label class="member-sale-label" for="sale_district_name">เขต / อำเภอ</label>
                <input id="sale_district_name" class="member-sale-input" name="sale[district_name]" value="{{ old('sale.district_name', $sale['district_name'] ?? '') }}">
            </div>
            <div>
                <label class="member-sale-label" for="sale_subdistrict_name">แขวง / ตำบล</label>
                <input id="sale_subdistrict_name" class="member-sale-input" name="sale[subdistrict_name]" value="{{ old('sale.subdistrict_name', $sale['subdistrict_name'] ?? '') }}">
            </div>
            <div>
                <label class="member-sale-label" for="sale_postal_code">รหัสไปรษณีย์</label>
                <input id="sale_postal_code" class="member-sale-input" name="sale[postal_code]" value="{{ old('sale.postal_code', $sale['postal_code'] ?? '') }}">
            </div>
        </div>
        <div class="mt-3">
            <label class="member-sale-label" for="sale_address_line">ที่อยู่จัดส่ง</label>
            <textarea id="sale_address_line" class="member-sale-textarea" name="sale[address_line]">{{ old('sale.address_line', $sale['address_line'] ?? '') }}</textarea>
        </div>
        <div class="mt-3">
            <label class="member-sale-label" for="sale_note">หมายเหตุจัดส่ง</label>
            <textarea id="sale_note" class="member-sale-textarea" name="sale[note]">{{ old('sale.note', $sale['note'] ?? '') }}</textarea>
        </div>
    </div>
</div>

<script>
(() => {
    const root = document.querySelector('.member-sale-page');
    if (!root) return;

    const memberDirectory = JSON.parse(root.dataset.memberDirectory || '[]');
    const productCatalog = JSON.parse(root.dataset.productCatalog || '[]');
    const topProducts = JSON.parse(root.dataset.topProducts || '[]');

    const memberSearch = document.getElementById('member_sale_member_search');
    const memberIdInput = document.getElementById('member_sale_member_id');
    const memberResults = document.getElementById('memberSaleMemberResults');
    const selectedMemberLabel = document.getElementById('memberSaleSelectedMemberLabel');

    const productSearch = document.getElementById('member_sale_product_search');
    const productResults = document.getElementById('memberSaleProductResults');
    const productStrip = document.getElementById('memberSaleProductStrip');
    const productStripTitle = document.getElementById('memberSaleProductStripTitle');
    const selectedItemsWrap = document.getElementById('memberSaleSelectedItems');

    const pickupSection = document.getElementById('memberSalePickupSection');
    const deliverySection = document.getElementById('memberSaleDeliverySection');
    const defaultAddressBox = document.getElementById('memberSaleDefaultAddressBox');
    const changeAddressButton = document.getElementById('memberSaleToggleAddressChange');
    const existingShippingAddressId = document.getElementById('sale_existing_shipping_address_id');
    const changeShippingAddress = document.getElementById('sale_change_shipping_address');

    const fulfillmentInputs = Array.from(document.querySelectorAll('input[name="sale[fulfillment_method]"]'));
    const paymentInputs = Array.from(document.querySelectorAll('input[name="sale[payment_channel]"]'));
    const paymentSummary = document.getElementById('memberSalePaymentSummary');
    const discountWalletAmountInput = document.getElementById('sale_discount_wallet_amount');
    const shoppingWalletAmountInput = document.getElementById('sale_shopping_wallet_amount');
    const firmWalletAmountInput = document.getElementById('sale_firm_wallet_amount');
    const cashPaymentMethodInput = document.getElementById('sale_cash_payment_method');

    const fields = {
        recipientName: document.getElementById('sale_recipient_name'),
        phone: document.getElementById('sale_phone'),
        email: document.getElementById('sale_email'),
        label: document.getElementById('sale_label'),
        countryName: document.getElementById('sale_country_name'),
        countryCode: document.getElementById('sale_country_code'),
        provinceName: document.getElementById('sale_province_name'),
        districtName: document.getElementById('sale_district_name'),
        subdistrictName: document.getElementById('sale_subdistrict_name'),
        postalCode: document.getElementById('sale_postal_code'),
        addressLine: document.getElementById('sale_address_line'),
        note: document.getElementById('sale_note'),
        pickupRecipientName: document.getElementById('sale_pickup_recipient_name'),
        pickupPhone: document.getElementById('sale_pickup_phone'),
        pickupEmail: document.getElementById('sale_pickup_email'),
    };

    let selectedItems = @json(old('sale.items', $sale['items'] ?? []), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    function selectedMember() {
        return memberDirectory.find((member) => String(member.id) === String(memberIdInput.value)) || null;
    }

    function selectedFulfillment() {
        const checked = fulfillmentInputs.find((input) => input.checked);
        return checked ? checked.value : 'branch_pickup';
    }

    function selectedPaymentChannel() {
        const checked = paymentInputs.find((input) => input.checked);
        return checked ? checked.value : 'cash';
    }

    function renderMemberResults(items) {
        if (!items.length) {
            memberResults.classList.add('member-sale-hidden');
            memberResults.innerHTML = '';
            return;
        }

        memberResults.innerHTML = items.map((member) => `
            <button type="button" class="member-sale-result" data-member-id="${member.id}">
                <strong>${member.memberCode}</strong><br>
                <span>${member.name}</span>
            </button>
        `).join('');
        memberResults.classList.remove('member-sale-hidden');
    }

    function promotionGroupKey(product) {
        const minQty = Math.max(0, Number(product?.promotionMinQuantity || 0) || 0);
        const promoActive = String(product?.promotionStatus || '').toUpperCase() === 'ACTIVE';
        const promoPrice = Number(product?.promotionPrice || 0);
        const promoPv = Number(product?.promotionPv || 0);

        if (!promoActive || minQty < 2 || promoPrice <= 0 || promoPv <= 0 || Number(product?.pv || 0) !== 100) {
            return null;
        }

        const promotionIdentity = product?.promotionId
            ? `id:${product.promotionId}`
            : `snapshot:${minQty}:${promoPrice.toFixed(2)}:${promoPv.toFixed(2)}`;

        return `100pv:${promotionIdentity}`;
    }

    function promotionGroupQuantity(product, items = selectedItems, fallbackQuantity = 1) {
        const key = promotionGroupKey(product);
        if (!key) {
            return Math.max(1, Number(fallbackQuantity || 1) || 1);
        }

        const total = items.reduce((sum, item) => {
            const entry = productCatalog.find((candidate) => String(candidate.id) === String(item.product_detail_id));
            if (!entry || promotionGroupKey(entry) !== key) {
                return sum;
            }

            return sum + Math.max(1, Number(item.quantity || 1) || 1);
        }, 0);

        return total > 0 ? total : Math.max(1, Number(fallbackQuantity || 1) || 1);
    }

    function effectiveProductPricing(product, quantity, items = selectedItems) {
        const minQty = Math.max(0, Number(product?.promotionMinQuantity || 0) || 0);
        const promoActive = String(product?.promotionStatus || '').toUpperCase() === 'ACTIVE';
        const promoPrice = Number(product?.promotionPrice || 0);
        const promoPv = Number(product?.promotionPv || 0);
        const eligibleQuantity = promotionGroupQuantity(product, items, quantity);

        if (promoActive && minQty >= 2 && eligibleQuantity >= minQty && promoPrice > 0) {
            return {
                unitPrice: promoPrice,
                unitPv: promoPv,
                note: `${product.promotionName || 'Promotion'}: ซื้อรวม ${minQty} ชิ้นขึ้นไป (ต่าง SKU ได้) • ${promoPrice.toFixed(2)} บาท • PV ${promoPv.toFixed(2)}`,
            };
        }

        return {
            unitPrice: Number(product?.memberPrice || 0),
            unitPv: Number(product?.pv || 0),
            note: '',
        };
    }

    function productMetaText(product, quantity = 1, items = selectedItems) {
        const pricing = effectiveProductPricing(product, quantity, items);
        const baseText = `${product.code} · ${pricing.unitPrice.toFixed(2)} บาท · PV ${pricing.unitPv.toFixed(2)}`;
        const minQty = Math.max(0, Number(product?.promotionMinQuantity || 0) || 0);
        const promoActive = String(product?.promotionStatus || '').toUpperCase() === 'ACTIVE';
        const hasPromo = promoActive && minQty >= 2 && Number(product?.promotionPrice || 0) > 0;
        const availableNote = hasPromo
            ? `${product.promotionName || 'Promotion'}: ซื้อรวม ${minQty} ชิ้นขึ้นไป (ต่าง SKU ได้) • ${Number(product.promotionPrice || 0).toFixed(2)} บาท • PV ${Number(product.promotionPv || 0).toFixed(2)}`
            : '';

        if (pricing.note) {
            return `${baseText} · ${pricing.note}`;
        }

        return availableNote ? `${baseText} · ${availableNote}` : baseText;
    }

    function renderProductCards(items) {
        productStrip.innerHTML = items.map((product) => `
            <div class="member-sale-product-card">
                <div class="member-sale-product-image" style="background-image:url('${product.imageUrl || ''}')"></div>
                <div class="member-sale-product-body">
                    <div class="member-sale-product-name">${product.name}</div>
                    <div class="member-sale-product-meta">${productMetaText(product)}</div>
                    <button type="button" class="member-sale-product-action" data-product-id="${product.id}">เลือกสินค้า</button>
                </div>
            </div>
        `).join('');
    }

    function renderProductResults(items) {
        if (!items.length) {
            productResults.classList.add('member-sale-hidden');
            productResults.innerHTML = '';
            return;
        }

        productResults.innerHTML = items.map((product) => `
            <button type="button" class="member-sale-result" data-product-id="${product.id}">
                <strong>${product.name}</strong><br>
                <span>${productMetaText(product)}</span>
            </button>
        `).join('');
        productResults.classList.remove('member-sale-hidden');
    }

    function addProduct(productId) {
        const product = productCatalog.find((entry) => String(entry.id) === String(productId));
        if (!product) return;

        const existing = selectedItems.find((item) => String(item.product_detail_id) === String(product.id));
        if (existing) {
            existing.quantity = String((Number(existing.quantity || 1) || 1) + 1);
        } else {
            selectedItems.push({
                product_detail_id: String(product.id),
                quantity: '1',
            });
        }
        renderSelectedItems();
    }

    function renderSelectedItems() {
        if (!selectedItems.length) {
            selectedItemsWrap.innerHTML = '<div class="member-sale-note">ยังไม่ได้เลือกสินค้า</div>';
            syncPaymentFields();
            return;
        }

        selectedItemsWrap.innerHTML = selectedItems.map((item, index) => {
            const product = productCatalog.find((entry) => String(entry.id) === String(item.product_detail_id));
            if (!product) return '';
            const quantity = Math.max(1, Number(item.quantity || 1) || 1);
            const pricing = effectiveProductPricing(product, quantity, selectedItems);
            const lineTotal = (pricing.unitPrice * quantity).toFixed(2);
            const linePv = (pricing.unitPv * quantity).toFixed(2);

            return `
                <div class="member-sale-selected-item">
                    <div>
                        <strong>${product.name}</strong><br>
                        <span class="member-sale-note">${productMetaText(product, quantity, selectedItems)}</span><br>
                        <span class="member-sale-note">รวม ${lineTotal} บาท · PV รวม ${linePv}</span>
                    </div>
                    <div>
                        <label class="member-sale-label">จำนวน</label>
                        <input class="member-sale-input" type="number" min="1" value="${item.quantity || '1'}" data-qty-index="${index}">
                    </div>
                    <div>
                        <label class="member-sale-label">&nbsp;</label>
                        <button type="button" data-remove-index="${index}">ลบ</button>
                    </div>
                    <input type="hidden" name="sale[items][${index}][product_detail_id]" value="${product.id}">
                    <input type="hidden" name="sale[items][${index}][quantity]" value="${item.quantity || '1'}" data-hidden-qty-index="${index}">
                </div>
            `;
        }).join('');
        syncPaymentFields();
    }

    function orderSubtotal() {
        return selectedItems.reduce((sum, item) => {
            const product = productCatalog.find((entry) => String(entry.id) === String(item.product_detail_id));
            const quantity = Math.max(1, Number(item.quantity || 1) || 1);
            const pricing = effectiveProductPricing(product, quantity, selectedItems);

            return sum + (pricing.unitPrice * quantity);
        }, 0);
    }

    function syncPaymentFields() {
        const subtotal = orderSubtotal();
        const subtotalText = subtotal.toFixed(2);
        const paymentChannel = selectedPaymentChannel();
        const totalPv = selectedItems.reduce((sum, item) => {
            const product = productCatalog.find((entry) => String(entry.id) === String(item.product_detail_id));
            const quantity = Math.max(1, Number(item.quantity || 1) || 1);
            const pricing = effectiveProductPricing(product, quantity, selectedItems);

            return sum + (pricing.unitPv * quantity);
        }, 0).toFixed(2);

        discountWalletAmountInput.value = '0';
        shoppingWalletAmountInput.value = '0';
        firmWalletAmountInput.value = '0';
        cashPaymentMethodInput.value = 'cash';

        let summaryText = `ยอดรวมสินค้า ${subtotalText} บาท · PV รวม ${totalPv}`;

        if (paymentChannel === 'shopping_wallet') {
            shoppingWalletAmountInput.value = subtotalText;
            summaryText = `ยอดรวมสินค้า ${subtotalText} บาท · PV รวม ${totalPv} · ชำระด้วย SW`;
        } else if (paymentChannel === 'bank_transfer') {
            cashPaymentMethodInput.value = 'bank_transfer';
            summaryText = `ยอดรวมสินค้า ${subtotalText} บาท · PV รวม ${totalPv} · ชำระด้วยเงินโอน`;
        } else if (paymentChannel === 'other') {
            cashPaymentMethodInput.value = 'promptpay_qr';
            summaryText = `ยอดรวมสินค้า ${subtotalText} บาท · PV รวม ${totalPv} · ชำระด้วยช่องทางอื่นๆ`;
        } else {
            summaryText = `ยอดรวมสินค้า ${subtotalText} บาท · PV รวม ${totalPv} · ชำระด้วยเงินสด`;
        }

        paymentSummary.textContent = summaryText;
    }

    function fillDeliveryAddress(member) {
        const address = member?.defaultAddress || null;

        selectedMemberLabel.textContent = member
            ? `${member.memberCode} · ${member.name}`
            : 'ยังไม่ได้เลือก';

        fields.pickupRecipientName.value = member?.name || '';
        fields.pickupPhone.value = member?.phone || '';
        fields.pickupEmail.value = member?.email || '';

        if (!address) {
            existingShippingAddressId.value = '';
            defaultAddressBox.classList.add('member-sale-hidden');
            defaultAddressBox.innerHTML = '';
            changeShippingAddress.value = '1';
            return;
        }

        existingShippingAddressId.value = address.id || '';
        defaultAddressBox.innerHTML = `
            <strong>ที่อยู่ปัจจุบันของสมาชิก</strong><br>
            ${address.label ? `${address.label}<br>` : ''}
            ${address.recipientName || member.name}<br>
            ${address.phone || member.phone}<br>
            ${address.addressLine || '-'}<br>
            ${[address.subdistrictName, address.districtName, address.provinceName, address.postalCode].filter(Boolean).join(' ')}
        `;
        defaultAddressBox.classList.remove('member-sale-hidden');

        if (changeShippingAddress.value !== '1') {
            fields.recipientName.value = address.recipientName || member.name || '';
            fields.phone.value = address.phone || member.phone || '';
            fields.email.value = address.email || member.email || '';
            fields.label.value = address.label || 'Default address';
            fields.countryName.value = address.countryName || 'Thailand';
            fields.countryCode.value = address.countryCode || 'TH';
            fields.provinceName.value = address.provinceName || '';
            fields.districtName.value = address.districtName || '';
            fields.subdistrictName.value = address.subdistrictName || '';
            fields.postalCode.value = address.postalCode || '';
            fields.addressLine.value = address.addressLine || '';
            fields.note.value = address.note || '';
        }
    }

    function syncFulfillmentSections() {
        const mode = selectedFulfillment();
        const delivery = mode === 'delivery';
        pickupSection.classList.toggle('member-sale-hidden', delivery);
        deliverySection.classList.toggle('member-sale-hidden', !delivery);
    }

    memberSearch.addEventListener('input', () => {
        const keyword = memberSearch.value.trim().toLowerCase();
        if (!keyword) {
            renderMemberResults(memberDirectory.slice(0, 8));
            return;
        }
        renderMemberResults(memberDirectory.filter((member) =>
            String(member.memberCode).toLowerCase().includes(keyword)
            || String(member.name).toLowerCase().includes(keyword)
        ).slice(0, 10));
    });

    memberResults.addEventListener('click', (event) => {
        const button = event.target.closest('[data-member-id]');
        if (!button) return;
        const member = memberDirectory.find((entry) => String(entry.id) === String(button.dataset.memberId));
        if (!member) return;
        memberIdInput.value = member.id;
        memberSearch.value = `${member.memberCode} · ${member.name}`;
        renderMemberResults([]);
        fillDeliveryAddress(member);
    });

    productSearch.addEventListener('input', () => {
        const keyword = productSearch.value.trim().toLowerCase();
        if (!keyword) {
            productStripTitle.textContent = 'สินค้าขายดี';
            renderProductResults([]);
            renderProductCards(topProducts);
            return;
        }

        const filtered = productCatalog.filter((product) =>
            String(product.name).toLowerCase().includes(keyword)
            || String(product.code).toLowerCase().includes(keyword)
        );
        productStripTitle.textContent = 'ผลการค้นหาสินค้า';
        renderProductCards(filtered);
        renderProductResults(filtered.slice(0, 12));
    });

    productStrip.addEventListener('click', (event) => {
        const button = event.target.closest('[data-product-id]');
        if (!button) return;
        addProduct(button.dataset.productId);
    });

    productResults.addEventListener('click', (event) => {
        const button = event.target.closest('[data-product-id]');
        if (!button) return;
        addProduct(button.dataset.productId);
        productSearch.value = '';
        productStripTitle.textContent = 'สินค้าขายดี';
        renderProductResults([]);
        renderProductCards(topProducts);
    });

    selectedItemsWrap.addEventListener('input', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement) || !target.dataset.qtyIndex) return;
        const index = Number(target.dataset.qtyIndex);
        if (!selectedItems[index]) return;
        selectedItems[index].quantity = String(Math.max(1, Number(target.value || 1) || 1));
        const hidden = selectedItemsWrap.querySelector(`[data-hidden-qty-index="${index}"]`);
        if (hidden) hidden.value = selectedItems[index].quantity;
        renderSelectedItems();
    });

    selectedItemsWrap.addEventListener('click', (event) => {
        const button = event.target.closest('[data-remove-index]');
        if (!button) return;
        selectedItems.splice(Number(button.dataset.removeIndex), 1);
        renderSelectedItems();
    });

    fulfillmentInputs.forEach((input) => {
        input.addEventListener('change', syncFulfillmentSections);
    });

    paymentInputs.forEach((input) => {
        input.addEventListener('change', syncPaymentFields);
    });

    changeAddressButton.addEventListener('click', () => {
        const nextValue = changeShippingAddress.value === '1' ? '0' : '1';
        changeShippingAddress.value = nextValue;
        changeAddressButton.textContent = nextValue === '1' ? 'ใช้ที่อยู่เดิมของสมาชิก' : 'เปลี่ยนที่อยู่จัดส่ง';
        fillDeliveryAddress(selectedMember());
    });

    renderProductCards(topProducts);
    renderSelectedItems();
    syncFulfillmentSections();
    syncPaymentFields();

    if (memberIdInput.value) {
        fillDeliveryAddress(selectedMember());
        const member = selectedMember();
        if (member) {
            memberSearch.value = `${member.memberCode} · ${member.name}`;
        }
    }

    if (changeShippingAddress.value === '1') {
        changeAddressButton.textContent = 'ใช้ที่อยู่เดิมของสมาชิก';
    }
})();
</script>
