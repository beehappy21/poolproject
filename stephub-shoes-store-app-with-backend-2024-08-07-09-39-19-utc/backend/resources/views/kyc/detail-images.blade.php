@php
    $images = $images ?? [];
    $cards = [
        ['label' => 'บัตรประชาชน', 'url' => $images['personal_id_image_url'] ?? null],
        ['label' => 'สมุดบัญชี', 'url' => $images['bank_book_image_url'] ?? null],
        ['label' => 'Selfie', 'url' => $images['selfie_image_url'] ?? null],
    ];
@endphp

<div class="row g-3">
    @foreach ($cards as $card)
        <div class="col-md-4">
            <div class="card h-100">
                <div class="card-header">{{ $card['label'] }}</div>
                <div class="card-body text-center">
                    @if (!empty($card['url']))
                        <img src="{{ $card['url'] }}" alt="{{ $card['label'] }}" style="max-width:100%; max-height:260px; object-fit:contain;">
                        <div class="mt-2">
                            <a href="{{ $card['url'] }}" target="_blank" rel="noopener noreferrer">เปิดภาพ</a>
                        </div>
                    @else
                        <div class="text-muted">No image</div>
                    @endif
                </div>
            </div>
        </div>
    @endforeach
</div>
