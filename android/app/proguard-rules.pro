# Ponte ProGuard Rules

# Keep Moshi adapters
-keepclassmembers class * {
    @com.squareup.moshi.Json <fields>;
}
-keep class com.ponte.data.remote.api.dto.** { *; }

# Socket.IO
-keep class io.socket.** { *; }
-keep class org.json.** { *; }

# WebRTC
-keep class org.webrtc.** { *; }

# Room
-keep class * extends androidx.room.RoomDatabase { *; }
-keep @androidx.room.Entity class * { *; }

# Retrofit
-keepattributes Signature
-keepattributes *Annotation*
-keep class retrofit2.** { *; }
-keepclasseswithmembers class * {
    @retrofit2.http.* <methods>;
}

# Coroutines
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}

# Strip logging in release
-assumenosideeffects class android.util.Log {
    public static int v(...);
    public static int d(...);
    public static int i(...);
}
