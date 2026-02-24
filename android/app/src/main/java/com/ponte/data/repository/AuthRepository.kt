package com.ponte.data.repository

import com.ponte.data.local.db.dao.SyncStateDao
import com.ponte.data.local.prefs.SecurePrefs
import com.ponte.data.remote.api.AuthApi
import com.ponte.data.remote.api.dto.DeviceInfoDto
import com.ponte.data.remote.api.dto.PairRequest
import com.ponte.data.remote.api.dto.RefreshRequest
import com.ponte.domain.model.DeviceInfo
import com.ponte.domain.repository.IAuthRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val authApi: AuthApi,
    private val securePrefs: SecurePrefs,
    private val syncStateDao: SyncStateDao
) : IAuthRepository {

    override suspend fun pair(pairingToken: String, deviceInfo: DeviceInfo): Result<Unit> =
        runCatching {
            val response = authApi.pair(
                PairRequest(
                    pairingToken = pairingToken,
                    deviceInfo = DeviceInfoDto(
                        name = deviceInfo.name,
                        androidVersion = deviceInfo.androidVersion
                    )
                )
            )
            securePrefs.accessToken = response.data.accessToken
            securePrefs.refreshToken = response.data.refreshToken
            securePrefs.deviceSecret = response.data.deviceSecret
            securePrefs.deviceId = response.data.deviceId
            // Reset sync state so full re-sync happens with new device_id
            syncStateDao.deleteAll()
        }

    override suspend fun refreshTokens(): Result<Unit> = runCatching {
        val currentRefresh = securePrefs.refreshToken
            ?: throw IllegalStateException("No refresh token available")
        val response = authApi.refresh(RefreshRequest(currentRefresh))
        securePrefs.accessToken = response.data.accessToken
        securePrefs.refreshToken = response.data.refreshToken
    }

    override suspend fun logout() {
        securePrefs.clear()
        syncStateDao.deleteAll()
    }

    override fun isPaired(): Boolean = securePrefs.isPaired
}
