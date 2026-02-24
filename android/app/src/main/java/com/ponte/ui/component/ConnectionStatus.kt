package com.ponte.ui.component

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.ponte.data.remote.ws.WsClient
import com.ponte.ui.theme.StatusConnected
import com.ponte.ui.theme.StatusDisconnected
import com.ponte.ui.theme.StatusReconnecting

@Composable
fun ConnectionStatus(
    state: WsClient.ConnectionState,
    modifier: Modifier = Modifier
) {
    val (color, label) = when (state) {
        WsClient.ConnectionState.CONNECTED -> StatusConnected to "Connected"
        WsClient.ConnectionState.RECONNECTING -> StatusReconnecting to "Reconnecting..."
        WsClient.ConnectionState.DISCONNECTED -> StatusDisconnected to "Disconnected"
    }

    Row(
        modifier = modifier.padding(8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Box(
            modifier = Modifier
                .size(10.dp)
                .background(color = color, shape = CircleShape)
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}
