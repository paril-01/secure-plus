// SecurePlus - Secure File System Operations
// This module handles the RAM-based file operations and secure cloud transitions

// Initialize the secure memory system
let secureMemory = {
    files: {},        // Store file contents in memory
    metadata: {},     // Store file metadata
    operations: [],   // Track operations for syncing
    activeSession: null, // Current user session
    encryptionKeys: {} // Store encryption keys for files
};

// Encryption utilities
const secureUtils = {
    // Generate random encryption key
    generateKey: function() {
        const array = new Uint8Array(32);
        window.crypto.getRandomValues(array);
        return Array.from(array, byte => ('0' + byte.toString(16)).slice(-2)).join('');
    },
    
    // Encrypt data using AES (simplified for demo)
    encrypt: function(data, key) {
        // In a real app, use the Web Crypto API for encryption
        // This is just for demonstration
        const encodedData = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
        return {
            ciphertext: encodedData,
            key: key || this.generateKey()
        };
    },
    
    // Decrypt data (simplified for demo)
    decrypt: function(ciphertext, key) {
        // In a real app, use the Web Crypto API for decryption
        try {
            return JSON.parse(decodeURIComponent(escape(atob(ciphertext))));
        } catch (e) {
            console.error('Decryption failed:', e);
            return null;
        }
    }
};

// Document security manager
const secureDocManager = {
    // Initialize secure document management
    init: function() {
        // Set up event listeners for window events
        window.addEventListener('beforeunload', this.secureCleanup);
        
        // Set up periodic syncing to cloud (every 2 minutes)
        setInterval(this.syncToCloud, 120000);
        
        console.log('Secure document manager initialized');
    },
    
    // Load a file into secure memory
    loadFile: function(fileId) {
        return new Promise((resolve, reject) => {
            // Check if file is already in memory
            if (secureMemory.files[fileId]) {
                resolve(secureMemory.files[fileId]);
                return;
            }
            
            // Fetch from API
            fetch(`/api/files/${fileId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            })
            .then(response => {
                if (!response.ok) throw new Error('File not found');
                return response.json();
            })
            .then(data => {
                // Store in secure memory
                secureMemory.files[fileId] = data.content;
                secureMemory.metadata[fileId] = {
                    filename: data.filename,
                    file_type: data.file_type,
                    last_modified: new Date()
                };
                
                // Store encryption key
                if (data.key) {
                    secureMemory.encryptionKeys[fileId] = data.key;
                }
                
                resolve(data.content);
            })
            .catch(error => {
                console.error('Error loading file:', error);
                reject(error);
            });
        });
    },
    
    // Save a file to secure memory
    saveFile: function(fileId, content, metadata = {}) {
        // Encrypt content
        const encryptionResult = secureUtils.encrypt(content);
        
        // Store in secure memory
        secureMemory.files[fileId] = encryptionResult.ciphertext;
        secureMemory.encryptionKeys[fileId] = encryptionResult.key;
        
        // Update metadata
        secureMemory.metadata[fileId] = {
            ...secureMemory.metadata[fileId],
            ...metadata,
            last_modified: new Date()
        };
        
        // Track operation for syncing
        secureMemory.operations.push({
            type: 'save',
            fileId: fileId,
            timestamp: new Date()
        });
        
        // Return a promise for chaining
        return Promise.resolve({
            fileId: fileId,
            status: 'saved_to_memory'
        });
    },
    
    // Create a new file in secure memory
    createFile: function(filename, fileType, content = '') {
        // Generate temporary ID
        const tempId = 'temp_' + Date.now();
        
        // Encrypt content
        const encryptionResult = secureUtils.encrypt(content);
        
        // Store in secure memory
        secureMemory.files[tempId] = encryptionResult.ciphertext;
        secureMemory.encryptionKeys[tempId] = encryptionResult.key;
        
        // Create metadata
        secureMemory.metadata[tempId] = {
            filename: filename,
            file_type: fileType,
            created_at: new Date(),
            last_modified: new Date()
        };
        
        // Track operation for syncing
        secureMemory.operations.push({
            type: 'create',
            fileId: tempId,
            timestamp: new Date()
        });
        
        return Promise.resolve({
            fileId: tempId,
            status: 'created_in_memory'
        });
    },
    
    // Delete a file from secure memory
    deleteFile: function(fileId) {
        // Remove from secure memory
        delete secureMemory.files[fileId];
        delete secureMemory.metadata[fileId];
        delete secureMemory.encryptionKeys[fileId];
        
        // Track operation for syncing
        secureMemory.operations.push({
            type: 'delete',
            fileId: fileId,
            timestamp: new Date()
        });
        
        return Promise.resolve({
            fileId: fileId,
            status: 'deleted_from_memory'
        });
    },
    
    // Sync changes to cloud
    syncToCloud: function() {
        // Only sync if there are operations to process
        if (secureMemory.operations.length === 0) return;
        
        console.log('Syncing changes to cloud...');
        
        // Process each operation
        const operations = [...secureMemory.operations];
        secureMemory.operations = [];
        
        operations.forEach(operation => {
            const fileId = operation.fileId;
            
            switch (operation.type) {
                case 'create':
                    // Create file on server
                    const createData = new FormData();
                    createData.append('filename', secureMemory.metadata[fileId].filename);
                    createData.append('file_type', secureMemory.metadata[fileId].file_type);
                    createData.append('content', secureMemory.files[fileId]);
                    createData.append('key', secureMemory.encryptionKeys[fileId]);
                    
                    fetch('/api/files/upload', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                        },
                        body: createData
                    })
                    .then(response => response.json())
                    .then(data => {
                        // Update fileId with server-assigned ID
                        const serverFileId = data.id;
                        secureMemory.files[serverFileId] = secureMemory.files[fileId];
                        secureMemory.metadata[serverFileId] = secureMemory.metadata[fileId];
                        secureMemory.encryptionKeys[serverFileId] = secureMemory.encryptionKeys[fileId];
                        
                        // Clean up temp entry
                        delete secureMemory.files[fileId];
                        delete secureMemory.metadata[fileId];
                        delete secureMemory.encryptionKeys[fileId];
                        
                        console.log(`File created on server with ID: ${serverFileId}`);
                    })
                    .catch(error => {
                        console.error('Error creating file on server:', error);
                        // Add back to operations queue for retry
                        secureMemory.operations.push(operation);
                    });
                    break;
                    
                case 'save':
                    // Skip temporary files not yet created on server
                    if (fileId.startsWith('temp_')) {
                        secureMemory.operations.push(operation);
                        return;
                    }
                    
                    // Update file on server
                    const updateData = new FormData();
                    updateData.append('content', secureMemory.files[fileId]);
                    updateData.append('key', secureMemory.encryptionKeys[fileId]);
                    
                    fetch(`/api/files/${fileId}`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                        },
                        body: updateData
                    })
                    .then(response => {
                        if (!response.ok) throw new Error('Failed to update file');
                        console.log(`File updated on server: ${fileId}`);
                    })
                    .catch(error => {
                        console.error('Error updating file on server:', error);
                        // Add back to operations queue for retry
                        secureMemory.operations.push(operation);
                    });
                    break;
                    
                case 'delete':
                    // Skip temporary files not yet created on server
                    if (fileId.startsWith('temp_')) return;
                    
                    // Delete file on server
                    fetch(`/api/files/${fileId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                        }
                    })
                    .then(response => {
                        if (!response.ok) throw new Error('Failed to delete file');
                        console.log(`File deleted on server: ${fileId}`);
                    })
                    .catch(error => {
                        console.error('Error deleting file on server:', error);
                        // Add back to operations queue for retry
                        secureMemory.operations.push(operation);
                    });
                    break;
            }
        });
    },
    
    // Secure cleanup when app is closed
    secureCleanup: function(event) {
        // Force sync to cloud
        secureDocManager.syncToCloud();
        
        // Call API to clear all traces
        fetch('/api/clear-traces', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
        }).catch(error => console.log('Error clearing traces:', error));
        
        // Clear secure memory
        secureMemory = {
            files: {},
            metadata: {},
            operations: [],
            activeSession: null,
            encryptionKeys: {}
        };
        
        // Clear local storage
        localStorage.clear();
        
        // For demo purposes, we're not preventing page unload
        // In a real app, you might need to handle this differently
    },
    
    // Get file listing from memory
    getFilesList: function() {
        // Convert metadata to array of file objects
        const files = Object.keys(secureMemory.metadata).map(fileId => {
            return {
                id: fileId,
                filename: secureMemory.metadata[fileId].filename,
                file_type: secureMemory.metadata[fileId].file_type,
                created_at: secureMemory.metadata[fileId].created_at,
                last_modified: secureMemory.metadata[fileId].last_modified
            };
        });
        
        return Promise.resolve(files);
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    secureDocManager.init();
    
    // Add additional event listeners for security features
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden') {
            // User switched tabs or minimized window - sync to ensure data safety
            secureDocManager.syncToCloud();
        }
    });
    
    // After a period of inactivity, lock the application
    let inactivityTimer;
    const resetInactivityTimer = function() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(function() {
            // Auto-lock after 5 minutes of inactivity
            if (document.getElementById('secure-plus-interface').classList.contains('active')) {
                logout(); // Call the logout function from main.js
            }
        }, 5 * 60 * 1000); // 5 minutes
    };
    
    // Reset timer on user activity
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
        document.addEventListener(event, resetInactivityTimer, true);
    });
    
    // Start the timer
    resetInactivityTimer();
});

// Export for use in other modules
window.secureDocManager = secureDocManager;
window.secureUtils = secureUtils;
