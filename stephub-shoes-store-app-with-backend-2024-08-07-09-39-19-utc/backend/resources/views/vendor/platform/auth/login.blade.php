@extends('platform::auth')
@section('title',__('Sign in to your account'))

@section('content')
    <h1 class="h4 text-black mb-4">{{__('Sign in to your account')}}</h1>

    @if (session('admin_password_reset_status'))
        <div class="alert alert-success" role="alert">
            {{ session('admin_password_reset_status') }}
        </div>
    @endif

    @if (session('admin_password_reset_error'))
        <div class="alert alert-danger" role="alert">
            {{ session('admin_password_reset_error') }}
        </div>
    @endif

    <form class="m-t-md"
          role="form"
          method="POST"
          data-controller="form"
          data-form-need-prevents-form-abandonment-value="false"
          data-action="form#submit"
          action="{{ route('platform.login.auth') }}">
        @csrf

        @includeWhen($isLockUser,'platform::auth.lockme')
        @includeWhen(!$isLockUser,'platform::auth.signin')
    </form>

    @unless($isLockUser)
        <hr class="my-4">

        <details class="small">
            <summary class="btn btn-link p-0 text-decoration-none">
                Reset super admin password
            </summary>

            <form class="mt-3"
                  role="form"
                  method="POST"
                  action="{{ route('bao.admin.password-reset') }}">
                @csrf

                <div class="mb-3">
                    <label class="form-label" for="admin-reset-identifier">
                        BAO login email
                    </label>
                    <input id="admin-reset-identifier"
                           class="form-control @error('identifier') is-invalid @enderror"
                           type="email"
                           name="identifier"
                           value="{{ old('identifier', old('email')) }}"
                           maxlength="120"
                           required>
                    @error('identifier')
                        <div class="invalid-feedback">{{ $message }}</div>
                    @enderror
                </div>

                <div class="mb-3">
                    <label class="form-label" for="admin-reset-new-password">
                        New password
                    </label>
                    <input id="admin-reset-new-password"
                           class="form-control @error('newPassword') is-invalid @enderror"
                           type="password"
                           name="newPassword"
                           minlength="6"
                           maxlength="256"
                           autocomplete="new-password"
                           required>
                    @error('newPassword')
                        <div class="invalid-feedback">{{ $message }}</div>
                    @enderror
                </div>

                <div class="mb-3">
                    <label class="form-label" for="admin-reset-override">
                        Override password
                    </label>
                    <input id="admin-reset-override"
                           class="form-control @error('adminOverridePassword') is-invalid @enderror"
                           type="password"
                           name="adminOverridePassword"
                           maxlength="256"
                           autocomplete="current-password"
                           required>
                    @error('adminOverridePassword')
                        <div class="invalid-feedback">{{ $message }}</div>
                    @enderror
                </div>

                <button type="submit" class="btn btn-outline-secondary w-100">
                    Reset password
                </button>
            </form>
        </details>
    @endunless
@endsection
