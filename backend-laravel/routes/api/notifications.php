<?php

use App\Http\Controllers\Api\V1\Notifications\NotificationController;
use App\Http\Controllers\Api\V1\Notifications\NotificationPreferenceController;
use App\Http\Controllers\Api\V1\Notifications\PushSubscriptionController;
use App\Http\Controllers\Api\V1\Notifications\RealtimeController;
use Illuminate\Support\Facades\Route;

// Notifications, push subscriptions and realtime channel auth.
// Loaded inside the authenticated app-route group in routes/api.php.

Route::get('notifications/push/config', [PushSubscriptionController::class, 'config']);
Route::post('notifications/push/subscription', [PushSubscriptionController::class, 'store']);
Route::delete('notifications/push/subscription', [PushSubscriptionController::class, 'destroy']);
Route::get('notification-preferences', [NotificationPreferenceController::class, 'show']);
Route::put('notification-preferences', [NotificationPreferenceController::class, 'update']);
Route::post('realtime/auth', [RealtimeController::class, 'auth'])->middleware('throttle:120,1');
Route::get('notifications', [NotificationController::class, 'index']);
Route::get('notifications/banners', [NotificationController::class, 'banners']);
Route::get('notifications/unread-count', [NotificationController::class, 'unreadCount']);
Route::post('notifications/{id}/read', [NotificationController::class, 'markRead']);
Route::post('notifications/read-all', [NotificationController::class, 'markAllRead']);
