import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import { API_URL, getAuthToken } from '../api';

class WebSocketService {
    constructor() {
        this.stompClient = null;
        this.subscriptions = new Map();
        this.isConnected = false;
        this.pendingSubscriptions = [];
    }

    connect(onConnected, onError) {
        // If already connected and active, just call the callback
        if (this.stompClient && this.stompClient.active && this.isConnected) {
            console.log('[WebSocketService] Already connected');
            if (onConnected) onConnected();
            return;
        }

        console.log('[WebSocketService] Initiating connection...');
        const socket = new SockJS(`${API_URL}/ws`);
        this.stompClient = Stomp.over(socket);

        // Disable debug logs in production (uncomment next line for debugging)
        // this.stompClient.debug = (str) => console.log('[STOMP Debug]', str);
        this.stompClient.debug = () => { };

        const token = getAuthToken();

        this.stompClient.connect(
            { Authorization: `Bearer ${token}` },
            () => {
                console.log('[WebSocketService] Connection established');
                this.isConnected = true;

                // Process any pending subscriptions
                this.processPendingSubscriptions();

                if (onConnected) onConnected();
            },
            (error) => {
                console.error('[WebSocketService] Connection error:', error);
                this.isConnected = false;
                if (onError) onError(error);

                // Attempt reconnect after delay
                setTimeout(() => {
                    console.log('[WebSocketService] Attempting reconnection...');
                    this.connect(onConnected, onError);
                }, 5000);
            }
        );
    }

    processPendingSubscriptions() {
        console.log(`[WebSocketService] Processing ${this.pendingSubscriptions.length} pending subscriptions`);
        while (this.pendingSubscriptions.length > 0) {
            const { topic, callback, resolve } = this.pendingSubscriptions.shift();
            const subscription = this.subscribe(topic, callback);
            if (resolve) resolve(subscription);
        }
    }

    subscribe(topic, callback) {
        if (!this.stompClient || !this.isConnected) {
            console.warn('[WebSocketService] Not connected. Cannot subscribe to:', topic);
            return null;
        }

        // Check if already subscribed to this topic
        if (this.subscriptions.has(topic)) {
            console.log('[WebSocketService] Already subscribed to:', topic);
            return this.subscriptions.get(topic);
        }

        console.log('[WebSocketService] Subscribing to:', topic);
        const subscription = this.stompClient.subscribe(topic, (message) => {
            try {
                const parsedBody = JSON.parse(message.body);
                console.log('[WebSocketService] Received message on', topic, ':', parsedBody);
                callback(parsedBody);
            } catch (e) {
                console.error('[WebSocketService] Error parsing message:', e);
            }
        });

        this.subscriptions.set(topic, subscription);
        return subscription;
    }

    send(destination, body) {
        if (this.stompClient && this.isConnected) {
            console.log('[WebSocketService] Sending to', destination, ':', body);
            this.stompClient.send(destination, {}, JSON.stringify(body));
        } else {
            console.error('[WebSocketService] Not connected. Cannot send message.');
        }
    }

    disconnect() {
        console.log('[WebSocketService] Disconnecting...');
        if (this.stompClient) {
            this.stompClient.disconnect();
        }
        this.isConnected = false;
        this.subscriptions.clear();
        this.pendingSubscriptions = [];
    }

    // Check if connected
    getConnectionStatus() {
        return this.isConnected;
    }

    // Subscribe to private messages queue
    subscribeToPrivateMessages(username, callback) {
        // Use generic /user/queue/messages - Spring maps this to the user's unique session queue
        const topic = '/user/queue/messages';
        console.log('[WebSocketService] Setting up private messages subscription');
        return this.subscribe(topic, callback);
    }

    // Subscribe to message deletion events
    subscribeToMessageDeleted(callback) {
        const topic = '/user/queue/message-deleted';
        console.log('[WebSocketService] Setting up message deletion subscription');
        return this.subscribe(topic, callback);
    }

    // Subscribe to group chat messages
    subscribeToGroupChat(groupId, callback) {
        const topic = `/topic/group/${groupId}`;
        console.log('[WebSocketService] Setting up group chat subscription for group:', groupId);
        return this.subscribe(topic, callback);
    }
}

const webSocketService = new WebSocketService();
export default webSocketService;
