package com.ponte.di

import com.ponte.data.local.prefs.SecurePrefs
import com.ponte.data.remote.api.AuthApi
import com.ponte.data.remote.api.PonteApi
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.Authenticator
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.Route
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Named
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideMoshi(): Moshi = Moshi.Builder()
        .addLast(KotlinJsonAdapterFactory())
        .build()

    @Provides
    @Singleton
    @Named("authInterceptor")
    fun provideAuthInterceptor(securePrefs: SecurePrefs): Interceptor = Interceptor { chain ->
        val request = chain.request().newBuilder()
        securePrefs.accessToken?.let { token ->
            request.addHeader("Authorization", "Bearer $token")
        }
        chain.proceed(request.build())
    }

    /**
     * Rewrites the base URL at request time from SecurePrefs.
     * This allows pairing to set the server URL after Retrofit singleton is created.
     */
    @Provides
    @Singleton
    @Named("dynamicBaseUrlInterceptor")
    fun provideDynamicBaseUrlInterceptor(securePrefs: SecurePrefs): Interceptor =
        Interceptor { chain ->
            val serverUrl = securePrefs.serverUrl
            if (serverUrl != null) {
                val newBase = serverUrl.toHttpUrl()
                val originalUrl = chain.request().url
                // Combine base path (/v1) with endpoint path (/auth/pair)
                val basePath = newBase.encodedPath.trimEnd('/')
                val endpointPath = originalUrl.encodedPath.trimStart('/')
                val newUrl = originalUrl.newBuilder()
                    .scheme(newBase.scheme)
                    .host(newBase.host)
                    .port(newBase.port)
                    .encodedPath("$basePath/$endpointPath")
                    .build()
                chain.proceed(chain.request().newBuilder().url(newUrl).build())
            } else {
                chain.proceed(chain.request())
            }
        }

    @Provides
    @Singleton
    @Named("tokenRefreshAuthenticator")
    fun provideTokenRefreshAuthenticator(securePrefs: SecurePrefs): Authenticator =
        Authenticator { _: Route?, response: Response ->
            // Don't retry if this is already a refresh call (avoid infinite loop)
            if (response.request.url.encodedPath.contains("auth/refresh")) return@Authenticator null
            // Don't retry more than once
            if (response.priorResponse != null) return@Authenticator null

            val refreshToken = securePrefs.refreshToken ?: return@Authenticator null
            val serverUrl = securePrefs.serverUrl ?: return@Authenticator null

            try {
                val jsonMediaType = "application/json".toMediaType()
                val refreshBody = """{"refreshToken":"$refreshToken"}""".toRequestBody(jsonMediaType)
                val baseUrl = serverUrl.toHttpUrl()
                val refreshUrl = baseUrl.newBuilder()
                    .addPathSegment("auth")
                    .addPathSegment("refresh")
                    .build()

                val refreshRequest = Request.Builder()
                    .url(refreshUrl)
                    .post(refreshBody)
                    .build()

                val refreshResponse = OkHttpClient.Builder()
                    .connectTimeout(10, TimeUnit.SECONDS)
                    .readTimeout(10, TimeUnit.SECONDS)
                    .build()
                    .newCall(refreshRequest)
                    .execute()

                if (refreshResponse.isSuccessful) {
                    val body = refreshResponse.body?.string() ?: return@Authenticator null
                    val json = org.json.JSONObject(body)
                    val data = json.getJSONObject("data")
                    val newAccess = data.getString("accessToken")
                    val newRefresh = data.getString("refreshToken")
                    securePrefs.accessToken = newAccess
                    securePrefs.refreshToken = newRefresh

                    response.request.newBuilder()
                        .header("Authorization", "Bearer $newAccess")
                        .build()
                } else {
                    null
                }
            } catch (_: Exception) {
                null
            }
        }

    @Provides
    @Singleton
    fun provideOkHttpClient(
        @Named("authInterceptor") authInterceptor: Interceptor,
        @Named("dynamicBaseUrlInterceptor") dynamicBaseUrlInterceptor: Interceptor,
        @Named("tokenRefreshAuthenticator") tokenRefreshAuthenticator: Authenticator
    ): OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(dynamicBaseUrlInterceptor)
        .addInterceptor(authInterceptor)
        .authenticator(tokenRefreshAuthenticator)
        .addInterceptor(HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        })
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    @Provides
    @Singleton
    fun provideRetrofit(
        okHttpClient: OkHttpClient,
        moshi: Moshi
    ): Retrofit = Retrofit.Builder()
        .baseUrl("http://localhost/")  // placeholder, overridden by interceptor
        .client(okHttpClient)
        .addConverterFactory(MoshiConverterFactory.create(moshi))
        .build()

    @Provides
    @Singleton
    fun provideAuthApi(retrofit: Retrofit): AuthApi = retrofit.create(AuthApi::class.java)

    @Provides
    @Singleton
    fun providePonteApi(retrofit: Retrofit): PonteApi = retrofit.create(PonteApi::class.java)
}