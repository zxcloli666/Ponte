package com.ponte.ui.screen.permissions

import android.Manifest
import android.app.role.RoleManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.telecom.TelecomManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.MultiplePermissionsState
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberMultiplePermissionsState

data class PermissionGroup(
    val title: String,
    val description: String,
    val permissions: List<String>
)

private val permissionGroups = buildList {
    add(
        PermissionGroup(
            title = "SMS",
            description = "Чтение, получение и отправка SMS",
            permissions = listOf(
                Manifest.permission.READ_SMS,
                Manifest.permission.RECEIVE_SMS,
                Manifest.permission.SEND_SMS
            )
        )
    )
    add(
        PermissionGroup(
            title = "Звонки",
            description = "История, совершение и приём звонков, определение SIM-карт",
            permissions = buildList {
                add(Manifest.permission.READ_PHONE_STATE)
                add(Manifest.permission.READ_CALL_LOG)
                add(Manifest.permission.READ_PHONE_NUMBERS)
                add(Manifest.permission.CALL_PHONE)
                add(Manifest.permission.ANSWER_PHONE_CALLS)
            }
        )
    )
    add(
        PermissionGroup(
            title = "Контакты",
            description = "Синхронизация контактов с устройства",
            permissions = listOf(Manifest.permission.READ_CONTACTS)
        )
    )
    add(
        PermissionGroup(
            title = "Камера",
            description = "Сканирование QR-кода для подключения",
            permissions = listOf(Manifest.permission.CAMERA)
        )
    )
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        add(
            PermissionGroup(
                title = "Уведомления",
                description = "Отправка уведомлений о событиях",
                permissions = listOf(Manifest.permission.POST_NOTIFICATIONS)
            )
        )
    }
}

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun PermissionsScreen(
    onAllGranted: () -> Unit
) {
    val context = LocalContext.current
    val allPermissions = permissionGroups.flatMap { it.permissions }
    val permissionsState = rememberMultiplePermissionsState(allPermissions) {
        // Check after permissions result
    }

    val allGranted = permissionsState.permissions.all { it.status.isGranted }
    val batteryOptimized = remember { mutableStateOf(isBatteryOptimized(context)) }

    Scaffold { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(24.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "Разрешения",
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.primary
            )

            Text(
                text = "Ponte нужны разрешения для синхронизации данных с вашего устройства.",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(8.dp))

            permissionGroups.forEach { group ->
                PermissionGroupCard(
                    group = group,
                    permissionsState = permissionsState
                )
            }

            // Default dialer card (required for silent call management)
            val defaultDialerEnabled = remember { mutableStateOf(isDefaultDialer(context)) }
            val dialerLauncher = rememberLauncherForActivityResult(
                contract = ActivityResultContracts.StartActivityForResult()
            ) {
                defaultDialerEnabled.value = isDefaultDialer(context)
            }
            DefaultDialerCard(
                isEnabled = defaultDialerEnabled.value,
                onRequest = {
                    try {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            val roleManager = context.getSystemService(RoleManager::class.java)
                            dialerLauncher.launch(roleManager.createRequestRoleIntent(RoleManager.ROLE_DIALER))
                        } else {
                            val telecomIntent = Intent(TelecomManager.ACTION_CHANGE_DEFAULT_DIALER).apply {
                                putExtra(TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME, context.packageName)
                            }
                            dialerLauncher.launch(telecomIntent)
                        }
                    } catch (e: Exception) {
                        android.util.Log.e("Permissions", "Failed to request default dialer", e)
                    }
                }
            )

            // Notification listener card (requires manual toggle in Settings)
            val notifListenerEnabled = remember { mutableStateOf(isNotificationListenerEnabled(context)) }
            NotificationListenerCard(
                isEnabled = notifListenerEnabled.value,
                onRequest = {
                    context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    })
                }
            )

            // Battery optimization card
            BatteryOptimizationCard(
                isExempt = !batteryOptimized.value,
                onRequest = {
                    requestBatteryOptimizationExemption(context)
                    batteryOptimized.value = isBatteryOptimized(context)
                }
            )

            Spacer(modifier = Modifier.height(16.dp))

            Button(
                onClick = {
                    if (allGranted) {
                        onAllGranted()
                    } else {
                        permissionsState.launchMultiplePermissionRequest()
                    }
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(if (allGranted) "Продолжить" else "Запросить разрешения")
            }

            if (!allGranted) {
                TextButton(
                    onClick = onAllGranted,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Пропустить")
                }
            }
        }
    }
}

@Composable
private fun BatteryOptimizationCard(
    isExempt: Boolean,
    onRequest: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = if (isExempt)
                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
            else
                MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Фоновая работа",
                    style = MaterialTheme.typography.titleSmall
                )
                Text(
                    text = "Отключение оптимизации батареи для стабильной работы в фоне",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                if (!isExempt) {
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedButton(onClick = onRequest) {
                        Text("Отключить оптимизацию")
                    }
                }
            }
            Spacer(modifier = Modifier.width(12.dp))
            Icon(
                imageVector = if (isExempt) Icons.Default.Check else Icons.Default.Close,
                contentDescription = null,
                tint = if (isExempt) MaterialTheme.colorScheme.primary
                else MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(24.dp)
            )
        }
    }
}

@Composable
private fun NotificationListenerCard(
    isEnabled: Boolean,
    onRequest: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = if (isEnabled)
                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
            else
                MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Доступ к уведомлениям",
                    style = MaterialTheme.typography.titleSmall
                )
                Text(
                    text = "Перехват уведомлений приложений для пересылки",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                if (!isEnabled) {
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedButton(onClick = onRequest) {
                        Text("Открыть настройки")
                    }
                }
            }
            Spacer(modifier = Modifier.width(12.dp))
            Icon(
                imageVector = if (isEnabled) Icons.Default.Check else Icons.Default.Close,
                contentDescription = null,
                tint = if (isEnabled) MaterialTheme.colorScheme.primary
                else MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(24.dp)
            )
        }
    }
}

@Composable
private fun DefaultDialerCard(
    isEnabled: Boolean,
    onRequest: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = if (isEnabled)
                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
            else
                MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Звонилка по умолчанию",
                    style = MaterialTheme.typography.titleSmall
                )
                Text(
                    text = "Управление звонками в фоне без всплывающего UI",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                if (!isEnabled) {
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedButton(onClick = onRequest) {
                        Text("Установить Ponte")
                    }
                }
            }
            Spacer(modifier = Modifier.width(12.dp))
            Icon(
                imageVector = if (isEnabled) Icons.Default.Check else Icons.Default.Close,
                contentDescription = null,
                tint = if (isEnabled) MaterialTheme.colorScheme.primary
                else MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(24.dp)
            )
        }
    }
}

@Suppress("MissingPermission")
private fun isDefaultDialer(context: Context): Boolean {
    val tm = context.getSystemService(Context.TELECOM_SERVICE) as TelecomManager
    return tm.defaultDialerPackage == context.packageName
}

private fun isNotificationListenerEnabled(context: Context): Boolean {
    val flat = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
    return flat?.contains(context.packageName) == true
}

private fun isBatteryOptimized(context: Context): Boolean {
    val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
    return !pm.isIgnoringBatteryOptimizations(context.packageName)
}

@Suppress("BatteryLife")
private fun requestBatteryOptimizationExemption(context: Context) {
    val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
        data = Uri.parse("package:${context.packageName}")
    }
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(intent)
}

@OptIn(ExperimentalPermissionsApi::class)
@Composable
private fun PermissionGroupCard(
    group: PermissionGroup,
    permissionsState: MultiplePermissionsState
) {
    val granted = group.permissions.all { perm ->
        permissionsState.permissions.find { it.permission == perm }?.status?.isGranted == true
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = if (granted)
                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
            else
                MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = group.title,
                    style = MaterialTheme.typography.titleSmall
                )
                Text(
                    text = group.description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Icon(
                imageVector = if (granted) Icons.Default.Check else Icons.Default.Close,
                contentDescription = null,
                tint = if (granted) MaterialTheme.colorScheme.primary
                else MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(24.dp)
            )
        }
    }
}