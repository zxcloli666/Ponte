package com.ponte.data.remote.api

import com.ponte.data.remote.api.dto.ApiResponse
import com.ponte.data.remote.api.dto.SimSyncRequest
import com.ponte.data.remote.api.dto.SimResponseDto
import com.squareup.moshi.JsonClass
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface PonteApi {

    @POST("sims/sync")
    suspend fun syncSims(@Body request: SimSyncRequest): ApiResponse<List<SimResponseDto>>

    @GET("sims")
    suspend fun getSims(): ApiResponse<List<SimResponseDto>>

    @POST("sims/{simId}/extra-numbers")
    suspend fun createExtraNumber(
        @Path("simId") simId: String,
        @Body request: ExtraNumberRequest
    ): ApiResponse<ExtraNumberResponse>

    @DELETE("extra-numbers/{id}")
    suspend fun deleteExtraNumber(@Path("id") id: String)
}

@JsonClass(generateAdapter = true)
data class ExtraNumberRequest(
    val prefix: String,
    val phoneNumber: String,
    val displayName: String,
    val displayNumber: String,
    val color: String,
    val sortOrder: Int = 0
)

@JsonClass(generateAdapter = true)
data class ExtraNumberResponse(
    val id: String,
    val simId: String,
    val prefix: String,
    val phoneNumber: String,
    val displayName: String,
    val displayNumber: String,
    val color: String,
    val sortOrder: Int
)