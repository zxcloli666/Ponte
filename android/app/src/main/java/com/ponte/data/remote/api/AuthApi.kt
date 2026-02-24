package com.ponte.data.remote.api

import com.ponte.data.remote.api.dto.ApiResponse
import com.ponte.data.remote.api.dto.PairRequest
import com.ponte.data.remote.api.dto.PairResponse
import com.ponte.data.remote.api.dto.RefreshRequest
import com.ponte.data.remote.api.dto.TokenPairResponse
import retrofit2.http.Body
import retrofit2.http.POST

interface AuthApi {

    @POST("auth/pair")
    suspend fun pair(@Body request: PairRequest): ApiResponse<PairResponse>

    @POST("auth/refresh")
    suspend fun refresh(@Body request: RefreshRequest): ApiResponse<TokenPairResponse>
}