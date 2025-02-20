# MQTT UniApp 与阿里云物联网平台连接

这是一个使用 MQTT 协议连接阿里云物联网平台的 UniApp 应用。该应用支持订阅主题、发布消息以及与设备（如智能锁）进行交互。它展示了基本的 MQTT 客户端功能，包括连接处理、消息接收和设备状态更新。

## 功能特性

- **MQTT 连接**：通过 MQTT 协议与阿里云物联网平台安全连接。
- **主题订阅**：订阅主题，接收实时设备数据更新。
- **状态管理**：更新和切换设备状态（例如智能锁状态）。
- **消息发布**：将设备状态上报到指定的主题。
- **自动状态更新**：根据接收到的消息更新设备状态。
- **时间戳格式化**：将接收到的时间戳转换为可读的时间格式。

## 项目设置

### 前提条件

- [UniApp CLI](https://uniapp.dcloud.io/)
- [Node.js](https://nodejs.org/)
- 阿里云物联网平台的有效账号及设备凭证。

### 安装步骤

1. 克隆项目：
```
git clone https://github.com/yourusername/your-repository.git
   ```
2. 安装依赖：
  ```
  npm install
   ```
3. 启动项目：
  ```
npm run dev:%platform%
  ```
4. 配置 ``MQTT`` 连接：在 App.vue 中的 data() 函数里替换设备的相关 MQTT 凭证：
```
host: "iot-XXXXXX.mqtt.iothub.aliyuncs.com",  // 替换为您的 MQTT 主机
port: 443,
clientId: "your-client-id",
username: "your-username",
password: "your-password",
setTopic: "/your-device-id/user/get",  // 替换为您的设备主题
pubTopic: "/sys/your-device-id/thing/event/property/post",
pubReply: "/sys/your-device-id/thing/event/property/post_reply",
```
### MQTT 主题
- setTopic：该主题用于订阅设备数据。
- pubTopic：该主题用于发布设备状态。
- pubReply：该主题用于接收设备的回复消息。
## 主要功能
### 1. connectMQTT()
- 建立与 MQTT 服务器的连接。
- 订阅设备状态更新主题。
- 发布初始设备状态。
### 2. onMessageReceived()
- 处理接收到的 MQTT 消息。
- 解析消息并根据消息更新应用状态。
### 3. toggleLockState()
- 切换锁的状态（例如：上锁 / 解锁）。
- 将新的状态上报到云端。
### 4. clearData()
- 重置应用状态，断开 MQTT 连接并清除数据。
### 5. disconnectMQTT()
- 断开 MQTT 客户端连接。
### 6. formatTimestamp()
- 将时间戳转换为易于阅读的时间格式。
## 使用方法
### 1. 连接到 MQTT：
- 启动应用后，应用会自动连接到 MQTT 服务器，使用提供的凭证进行身份验证。
### 2. 订阅主题：
- 应用会订阅设备的状态更新主题，以接收实时消息。
### 3. 发布消息：
- 应用会将设备状态等信息发布到 pubTopic 主题。
### 4. 切换锁状态：
- 用户可以切换锁的状态（例如：从上锁切换为解锁），并将更新后的状态发送到物联网平台。
### 5. 查看消息：
- 所有接收到的 MQTT 消息将存储在 messages[] 数组中，并显示在应用中。
## 问题排查
- **连接问题**：确保您的 MQTT 凭证和设备主题配置正确。
- **消息解析**：如果收到的消息格式无效，确保消息遵循预期的 JSON 结构。
