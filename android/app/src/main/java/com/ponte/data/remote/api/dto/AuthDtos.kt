package com.ponte.data.remote.api.dto

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class ApiResponse<T>(
    val data: T,
    val meta: Meta?
)

@JsonClass(generateAdapter = true)
data class Meta(
    val timestamp: String?
)

@JsonClass(generateAdapter = true)
data class PairRequest(
    val pairingToken: String,
    val deviceInfo: DeviceInfoDto
)

@JsonClass(generateAdapter = true)
data class DeviceInfoDto(
    val name: String,
    val androidVersion: String
)

@JsonClass(generateAdapter = true)
data class PairResponse(
    val accessToken: String,
    val refreshToken: String,
    val deviceSecret: String,
    val deviceId: String
)

@JsonClass(generateAdapter = true)
data class RefreshRequest(
    val refreshToken: String
)

@JsonClass(generateAdapter = true)
data class TokenPairResponse(
    val accessToken: String,
    val refreshToken: String
)

@JsonClass(generateAdapter = true)
data class SimSyncRequest(
    val sims: List<SimDto>
)

@JsonClass(generateAdapter = true)
data class SimDto(
    val slotIndex: Int,
    val iccId: String,
    val carrierName: String,
    val rawNumber: String?,
    val displayName: String,
    val displayNumber: String?,
    val color: String,
    val isDefault: Boolean
)

@JsonClass(generateAdapter = true)
data class SimResponseDto(
    val id: String,
    val slotIndex: Int,
    val iccId: String,
    val carrierName: String,
    val rawNumber: String?,
    val displayName: String,
    val displayNumber: String?,
    val color: String,
    val isDefault: Boolean,
    val extraNumbers: List<ExtraNumberDto>? = null
)

@JsonClass(generateAdapter = true)
data class ExtraNumberDto(
    val id: String,
    val simId: String,
    val prefix: String,
    val phoneNumber: String,
    val displayName: String,
    val displayNumber: String,
    val color: String,
    val sortOrder: Int = 0
)
