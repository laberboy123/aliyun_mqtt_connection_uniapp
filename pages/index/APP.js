import mqtt from 'mqtt/dist/mqtt.js';

export default {
	data() {
		return {
			host: "iot-06z009x0arwe1va.mqtt.iothub.aliyuncs.com",
			port: 443,
			clientId: "j120vFnUp26.web_mqtt|securemode=2,signmethod=hmacsha256,timestamp=1737290441216|",
			username: "web_mqtt&j120vFnUp26",
			password: "633ef089f6c6128c68cb9c833d2e73b64abb34ecfbfb13003fde3f4bfd75aa64",
			setTopic: "/j120vFnUp26/web_mqtt/user/get",
			pubTopic: "/sys/j120vFnUp26/web_mqtt/thing/event/property/post",
			pubReply: "/sys/j120vFnUp26/web_mqtt/thing/event/property/post_reply",
			isConnected: false,
			connectionStatus: "Disconnected",
			messages: [],
			state: null,
			time: null,
			client: null,
			parsedHistoryData: [],
			shelfData: {},
		};
	},
	onPullDownRefresh() {
		console.log("Pull-down refresh triggered.");
		this.clearData();
		this.disconnectMQTT();
		uni.stopPullDownRefresh();
	},
	methods: {
		connectMQTT() {
			const {
				host,
				port,
				clientId,
				username,
				password
			} = this;
			let http;
			// #ifdef H5
			http = `wss://${host}:${port}/mqtt`;
			// #endif

			// #ifdef APP-PLUS
			http = `wxs://${host}:${port}/mqtt`;
			// #endif

			// #ifndef MP
			// 处理 wx.connectSocket promisify 兼容问题，强制返�? SocketTask
			uni.connectSocket = (function(connectSocket) {
				return function(options) {
					console.log(options)
					options.success = options.success || function() {}
					return connectSocket.call(this, options)
				}
			})(uni.connectSocket)
			// #endif

			this.client = mqtt.connect(http, {
				clientId,
				username,
				password,
			});

			this.client.on("connect", () => {
				this.isConnected = true;
				this.connectionStatus = "Connected";

				// Subscribe to the topic
				this.client.subscribe(`${this.setTopic}`, (err) => {
					if (err) {
						console.error("Failed to subscribe", err);
					} else {
						console.log("Subscribed to topic successfully");
					}
				});
			});

			this.client.on("message", (topic, message) => {
				const msg = `Topic: ${topic}, Message: ${message.toString()}`;
				this.messages.push(msg);
				try {
					this.onMessageReceived(topic, message.toString());
				} catch (err) {
					console.warn("Received non-JSON message", message.toString());
				}
			});

			this.client.on("error", (error) => {
				console.error("MQTT Error:", error);
			});

			this.client.on("close", () => {
				this.isConnected = false;
				this.connectionStatus = "Disconnected";
			});
		},

		onMessageReceived(topic, rawMessage) {
			if (topic === `${this.setTopic}`) {
				try {
					const parsedMessage = JSON.parse(rawMessage);

					if (parsedMessage && parsedMessage.items) {
						this.deviceData = parsedMessage;
						// console.log("Parsed deviceData:", this.deviceData);
						const items = parsedMessage.items;
						// console.log("items:", items);

						Object.keys(items).forEach((key) => {
							const value = items[key];
							console.log("value:", value);
							if (value) {
								this.state = value.value;

								this.parsedHistoryData.push({
									time: value.time,
									state: this.state || "0",
								});
							}
							console.log("state", this.state);
						});
						this.parsedHistoryData.sort((a, b) => b.time - a.time);
					} else {
						console.warn("No items found in message");
					}
				} catch (err) {
					console.error("Failed to parse message:", err);
				}
			}
			// if (topic === `${this.pubReply}`) {
			// 	try {
			// 		const parsedMessage = JSON.parse(rawMessage);

			// 		if (parsedMessage) {
			// 			let id = parsedMessage.id;

			// 			this.parsedHistoryData.push({
			// 				time: Number(id),
			// 				state: this.state || "0",
			// 			});

			// 			this.parsedHistoryData.sort((a, b) => b.time - a.time);
			// 		} else {
			// 			console.warn("No items found in message");
			// 		}
			// 	} catch (err) {
			// 		console.error("Failed to parse message:", err);
			// 	}
			// }
		},
		// 切换锁状态
		toggleLockState() {
			// 切换当前锁状态
			const newState = this.state === 1 ? 0 : 1;

			// 更新本地状态
			this.state = newState;

			// 构造上报数据的 payload
			const payload = {
				id: Date.now().toString(),
				version: "1.0",
				params: {
					Lock: newState, // 上报的新状态
				},
				method: "thing.event.property.post"
			};

			// 上报数据到指定 Topic
			if (this.client) {
				this.client.publish(
					`${this.pubTopic}`, // 目标 Topic
					JSON.stringify(payload), // 数据
					(err) => {
						if (err) {
							console.error("Failed to publish lock state:", err);
						} else {
							console.log(`Lock state changed to ${newState} and reported successfully.`);
						}
					}
				);

			} else {
				console.warn("MQTT client is not connected.");
			}
		},
		clearData() {
			this.isConnected = false;
			this.connectionStatus = "Disconnected";
			this.messages = [];
			this.deviceData = {
				items: {},
			};
			this.parsedHistoryData = [];
			this.shelfData = {};
			console.log("clear values.");
		},
		disconnectMQTT() {
			if (this.client) {
				this.client.end();
				this.isConnected = false;
				this.connectionStatus = "Disconnected";
			}
		},
		// 格式化时间戳
		formatTimestamp(timestamp) {
			const date = new Date(timestamp);
			return date.toLocaleString();
		},
	},
};