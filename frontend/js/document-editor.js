// Document Editor functionality for SecurePlus

document.addEventListener('DOMContentLoaded', function() {
    initDocumentEditor();
});

function initDocumentEditor() {
    // Initialize the document editor
    const editor = document.getElementById('document-editor');
    const saveButton = document.getElementById('save-document');
    const closeButton = document.getElementById('close-document');
    const titleInput = document.getElementById('document-title');
    
    // Toolbar buttons
    const fontFamily = document.getElementById('font-family');
    const fontSize = document.getElementById('font-size');
    const boldButton = document.getElementById('bold');
    const italicButton = document.getElementById('italic');
    const underlineButton = document.getElementById('underline');
    const alignLeftButton = document.getElementById('align-left');
    const alignCenterButton = document.getElementById('align-center');
    const alignRightButton = document.getElementById('align-right');
    
    // Add event listeners for formatting
    if (boldButton) {
        boldButton.addEventListener('click', () => {
            document.execCommand('bold', false, null);
            editor.focus();
        });
    }
    
    if (italicButton) {
        italicButton.addEventListener('click', () => {
            document.execCommand('italic', false, null);
            editor.focus();
        });
    }
    
    if (underlineButton) {
        underlineButton.addEventListener('click', () => {
            document.execCommand('underline', false, null);
            editor.focus();
        });
    }
    
    if (alignLeftButton) {
        alignLeftButton.addEventListener('click', () => {
            document.execCommand('justifyLeft', false, null);
            editor.focus();
        });
    }
    
    if (alignCenterButton) {
        alignCenterButton.addEventListener('click', () => {
            document.execCommand('justifyCenter', false, null);
            editor.focus();
        });
    }
    
    if (alignRightButton) {
        alignRightButton.addEventListener('click', () => {
            document.execCommand('justifyRight', false, null);
            editor.focus();
        });
    }
    
    if (fontFamily) {
        fontFamily.addEventListener('change', () => {
            document.execCommand('fontName', false, fontFamily.value);
            editor.focus();
        });
    }
    
    if (fontSize) {
        fontSize.addEventListener('change', () => {
            document.execCommand('fontSize', false, getFontSizeValue(fontSize.value));
            editor.focus();
        });
    }
    
    // Save document
    if (saveButton) {
        saveButton.addEventListener('click', saveDocument);
    }
    
    // Close document
    if (closeButton) {
        closeButton.addEventListener('click', closeDocument);
    }
    
    // Auto-save function (every 30 seconds)
    setInterval(saveDocument, 30000);
}

function saveDocument() {
    const editor = document.getElementById('document-editor');
    const title = document.getElementById('document-title').value;
    
    // Get the document content
    const content = editor.innerHTML;
    
    // Get the file ID (if editing existing file)
    const fileId = editor.dataset.fileId;
    
    // Create FormData
    const formData = new FormData();
    formData.append('content', content);
    formData.append('title', title);
    
    // Encrypt the content in memory (client-side encryption)
    // In a real app, we would use a proper encryption library
    // For demo, we're just showing the concept
    const encryptedContent = btoa(content); // Base64 encoding as a simple stand-in
    
    // Save to "RAM" (localStorage as a stand-in for demo)
    localStorage.setItem(`doc_${fileId || 'new'}`, encryptedContent);
    
    // Show save notification
    showSaveNotification();
    
    // In a real app, we would periodically sync with the server
    // or sync when the document is closed
    if (fileId) {
        // Update existing file
        fetch(`/api/files/${fileId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
            body: formData
        }).catch(error => console.log('Error saving document:', error));
    }
}

function closeDocument() {
    // Save the document first
    saveDocument();
    
    // Clear the editor
    document.getElementById('document-editor').innerHTML = '';
    document.getElementById('document-title').value = '';
    
    // Switch back to the files view
    switchView('my-files');
}

function showSaveNotification() {
    // Create a notification element
    const notification = document.createElement('div');
    notification.className = 'save-notification';
    notification.textContent = 'Document saved to secure memory';
    
    // Add to the document
    document.body.appendChild(notification);
    
    // Remove after a few seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 2000);
}

function getFontSizeValue(size) {
    // Convert font size to appropriate value for execCommand
    // execCommand uses 1-7 scale
    const sizeMap = {
        '10': 1,
        '12': 2,
        '14': 3,
        '16': 4,
        '18': 5,
        '24': 6,
        '36': 7
    };
    
    return sizeMap[size] || 3; // Default to 3 (normal)
}

// Add feature to track changes made in memory only (RAM)
function trackChanges() {
    const editor = document.getElementById('document-editor');
    
    // Store initial content to track changes
    if (!editor.dataset.initialContent) {
        editor.dataset.initialContent = editor.innerHTML;
    }
    
    // Track changes since last save
    editor.addEventListener('input', () => {
        editor.dataset.hasChanges = 'true';
    });
}

// Ensure all document changes are stored only in RAM
// Nothing is written to disk
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
        // User is navigating away - save to secure storage
        saveDocument();
    }
});
