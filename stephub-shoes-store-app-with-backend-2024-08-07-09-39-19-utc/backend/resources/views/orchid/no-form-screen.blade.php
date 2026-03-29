@extends('platform::dashboard')

@section('title', (string) __($name))
@section('description', (string) __($description))
@section('controller', 'base')

@section('navbar')
    @foreach($commandBar as $command)
        <li class="{{ !$loop->first ? 'ms-2' : ''}}">
            {!! $command !!}
        </li>
    @endforeach
@endsection

@section('content')
    <div id="modals-container">
        @stack('modals-container')
    </div>

    {!! $layouts !!}

    <div data-controller="filter">
        <form id="filters" autocomplete="off"
              data-action="filter#submit"
              data-form-need-prevents-form-abandonment-value="false"
        ></form>
    </div>

    @includeWhen(isset($state), 'platform::partials.state')
@endsection
