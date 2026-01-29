import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import { API_URL, getAuthToken } from '../api';

class WebSocketService {
    constructor() {
        this.stompClient = null;
        this.subscriptions = new Map();
        this.isConnected = false;
    }

    connect(onConnected, onError) {
        if (this.stompClient && this.stompClient.active) {
            if (onConnected) onConnected();
            return;
        }

        const socket = new SockJS(`${API_URL}/ws`);
        this.stompClient = Stomp.over(socket);

        // Disable debug logs in production
        this.stompClient.debug = () => { };

        const token = getAuthToken();

        this.stompClient.connect(
            { Authorization: `Bearer ${token}` },
            () => {
                this.isConnected = true;
                if (onConnected) onConnected();
            },
            (error) => {
                console.error('WebSocket connection error:', error);
                this.isConnected = false;
                if (onError) onError(error);
                // Optional: Attempt reconnect after delay
            }
        );
    }

    subscribe(topic, callback) {
        if (!this.stompClient || !this.isConnected) {
            console.warn('WebSocket not connected. Cannot subscribe to', topic);
            return null;
        }

        const subscription = this.stompClient.subscribe(topic, (message) => {
            const parsedBody = JSON.parse(message.body);
            callback(parsedBody);
        });

        this.subscriptions.set(topic, subscription);
        return subscription;
    }

    send(destination, body) {
        if (this.stompClient && this.isConnected) {
            this.stompClient.send(destination, {}, JSON.stringify(body));
        } else {
            console.error('WebSocket not connected. Cannot send message.');
        }
    }

    disconnect() {
        if (this.stompClient) {
            this.stompClient.disconnect();
        }
        this.isConnected = false;
    }

    // Subscribe to private messages queue
    subscribeToPrivateMessages(username, callback) {
        // Use generic /user/queue/messages - Spring maps this to the user's unique session queue
        return this.subscribe(`/user/queue/messages`, callback);
    }

    // Subscribe to message deletion events
    subscribeToMessageDeleted(callback) {
        return this.subscribe(`/user/queue/message-deleted`, callback);
    }

    // Subscribe to group chat messages
    subscribeToGroupChat(groupId, callback) {
        return this.subscribe(`/topic/group/${groupId}`, callback);
    }
}

const webSocketService = new WebSocketService();
export default webSocketService;
