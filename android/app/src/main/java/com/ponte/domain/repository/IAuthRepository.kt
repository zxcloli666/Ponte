package com.ponte.domain.repository

import com.ponte.domain.model.DeviceInfo

interface IAuthRepository {
    suspend fun pair(pairingToken: String, deviceInfo: DeviceInfo): Result<Unit>
    suspend fun refreshTokens(): Result<Unit>
    suspend fun logout()
    fun isPaired(): Boolean
}
