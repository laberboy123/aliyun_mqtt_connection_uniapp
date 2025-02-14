<template>
	<div id="app" class="app-container">
		<h1>Aliyun MQTT Connection </h1>
		<div class="container">
			<h3>连接设置</h3>
			<!-- <div class="form-group">
				<label for="host">Host:</label>
				<input v-model="host" id="host" :disabled="true" />
			</div>
			<div class="form-group">
				<label for="port">Port:</label>
				<input v-model="port" type="number" id="port" :disabled="true" />
			</div> -->
			<div class="form-group">
				<label for="clientId">Client ID:</label>
				<input v-model="clientId" id="clientId" :disabled="true" />
			</div>
			<div class="form-group">
				<label for="username">Username:</label>
				<input v-model="username" id="username" :disabled="true" />
			</div>
			<!-- <div class="form-group">
				<label for="password">Password:</label>
				<input v-model="password" id="password" :disabled="true" />
			</div> -->
			<button v-if="!isConnected" @click="connectMQTT">Connect</button>
			<button v-else @click="disconnectMQTT">Disconnect</button>
		</div>
		<div id="connection-status">{{ connectionStatus }}</div>
		<hr />
		<div class="messages">
			<!-- 			<h2>消息显示</h2>
			<div class="messages-container">
				<text v-for="(msg, index) in messages" :key="index" class="message" selectable="true">{{ msg }}</text>
			</div> -->
		</div>
		<hr />
		<h3>设备数据</h3>
		<div class="device-data-container">
			<!-- 数据显示 -->
			<div class="device-data-item">
				<span class="data-name">当前锁状态</span>
				<div class="data-value">
					<p v-show="state == null"> 等待设备端数据 </p>
					<div v-show="state !== null">
						<p>Value: {{ state }} ({{ state === 1 ? '开' : '关' }}) </p>
					</div>

					<!-- 切换状态按钮 -->
					<button @click="toggleLockState">切换锁状态</button>
				</div>
			</div>
		</div>
		<h3>历史数据</h3>
		<div class="history-data-container">
			<div class="history-data-header">
				<div class="history-data-item">时间</div>
				<div class="history-data-item">锁状态</div>
			</div>
			<div class="history-data-row" v-for="(item, index) in parsedHistoryData" :key="index">
				<div class="history-data-item">{{ formatTimestamp(item.time) }}</div>
				<div class="history-data-item">{{ item.state === 1 ? '开' : '关' }}
				</div>
			</div>
		</div>
	</div>
</template>

<script>
	import APP from "./APP";
	export default APP;
</script>

<style src="./APP.css">

</style>