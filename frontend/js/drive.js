// Google Drive Clone Functionality

document.addEventListener('DOMContentLoaded', function() {
    // Initialize components
    initUserInterface();
    setupEventListeners();
    checkAuthentication();
});

function initUserInterface() {
    // Set the username from local storage if available
    const usernameDisplay = document.getElementById('username-display');
    if (usernameDisplay) {
        const storedUsername = localStorage.getItem('username') || 'testuser';
        usernameDisplay.textContent = storedUsername;
    }

    // Setup any UI components that need initialization
    setupContextMenu();
}

function setupEventListeners() {
    // Upload button
    const uploadBtn = document.getElementById('upload-btn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', showUploadModal);
    }

    // View toggle buttons
    const listViewBtn = document.getElementById('list-view');
    const gridViewBtn = document.getElementById('grid-view');
    
    if (listViewBtn && gridViewBtn) {
        listViewBtn.addEventListener('click', () => switchView('list'));
        gridViewBtn.addEventListener('click', () => switchView('grid'));
    }

    // New folder button
    const newFolderBtn = document.getElementById('new-folder');
    if (newFolderBtn) {
        newFolderBtn.addEventListener('click', createNewFolder);
    }

    // Modal close button
    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(button => {
        button.addEventListener('click', closeModals);
    });

    // Upload area
    const uploadArea = document.querySelector('.upload-area');
    if (uploadArea) {
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('drop', handleFileDrop);
    }

    // File input change
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }

    // Upload actions
    const cancelUploadBtn = document.getElementById('cancel-upload');
    const startUploadBtn = document.getElementById('start-upload');
    
    if (cancelUploadBtn && startUploadBtn) {
        cancelUploadBtn.addEventListener('click', closeModals);
        startUploadBtn.addEventListener('click', uploadFiles);
    }

    // Make files and folders clickable
    setupFileInteractions();
}

function checkAuthentication() {
    // Check if user is logged in (has a token)
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
        // Redirect to login/chess page if not authenticated
        window.location.href = 'index.html';
    }
}

function showUploadModal() {
    const uploadModal = document.getElementById('upload-modal');
    if (uploadModal) {
        uploadModal.style.display = 'flex';
    }
}

function closeModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
    
    // Clear upload list
    const uploadList = document.getElementById('upload-list');
    if (uploadList) {
        uploadList.innerHTML = '';
    }
}

function switchView(viewType) {
    const listViewBtn = document.getElementById('list-view');
    const gridViewBtn = document.getElementById('grid-view');
    const filesContainer = document.querySelector('.files-container');
    
    if (listViewBtn && gridViewBtn && filesContainer) {
        if (viewType === 'list') {
            listViewBtn.classList.add('active');
            gridViewBtn.classList.remove('active');
            filesContainer.classList.remove('grid-view');
            filesContainer.classList.add('list-view');
        } else if (viewType === 'grid') {
            gridViewBtn.classList.add('active');
            listViewBtn.classList.remove('active');
            filesContainer.classList.remove('list-view');
            filesContainer.classList.add('grid-view');
        }
    }
}

function createNewFolder() {
    // Mock folder creation
    const folderName = prompt('Enter folder name:', 'New Folder');
    
    if (folderName) {
        // Add folder to UI
        const allFilesTable = document.querySelector('.files-table tbody');
        
        if (allFilesTable) {
            const newRow = document.createElement('tr');
            newRow.className = 'file-row';
            newRow.setAttribute('data-type', 'folder');
            
            const currentDate = new Date();
            const dateString = `${currentDate.toLocaleString('default', { month: 'short' })} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
            
            newRow.innerHTML = `
                <td>
                    <div class="file-cell">
                        <span class="material-icons">folder</span>
                        <span>${folderName}</span>
                    </div>
                </td>
                <td>testuser</td>
                <td>${dateString}</td>
                <td>--</td>
                <td>
                    <div class="actions">
                        <button class="icon-button"><span class="material-icons">share</span></button>
                        <button class="icon-button"><span class="material-icons">more_vert</span></button>
                    </div>
                </td>
            `;
            
            allFilesTable.prepend(newRow);
            
            // Setup interactions for the new folder
            setupFileInteractions();
            
            // Show notification
            showNotification(`Folder "${folderName}" created successfully`);
        }
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('dragover');
}

function handleFileDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dragover');
    
    if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
    }
}

function handleFileSelect(e) {
    if (e.target.files.length > 0) {
        processFiles(e.target.files);
    }
}

function processFiles(files) {
    const uploadList = document.getElementById('upload-list');
    
    if (uploadList) {
        // Clear current list
        uploadList.innerHTML = '';
        
        Array.from(files).forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'upload-item';
            
            // Format file size
            const size = formatFileSize(file.size);
            
            fileItem.innerHTML = `
                <div class="upload-item-name">${file.name}</div>
                <div class="upload-item-size">${size}</div>
                <div class="upload-item-status">Pending</div>
            `;
            
            uploadList.appendChild(fileItem);
        });
    }
}

function uploadFiles() {
    const uploadItems = document.querySelectorAll('.upload-item');
    const totalFiles = uploadItems.length;
    let uploadedCount = 0;
    
    if (totalFiles === 0) {
        showNotification('No files selected for upload');
        return;
    }
    
    // Simulate upload process
    uploadItems.forEach((item, index) => {
        const statusElement = item.querySelector('.upload-item-status');
        statusElement.textContent = 'Uploading...';
        
        // Simulate upload with different timing for each file
        const delay = 1000 + (index * 500);
        
        setTimeout(() => {
            statusElement.textContent = 'Complete';
            uploadedCount++;
            
            // When all files are uploaded
            if (uploadedCount === totalFiles) {
                setTimeout(() => {
                    closeModals();
                    showNotification(`Successfully uploaded ${totalFiles} file${totalFiles > 1 ? 's' : ''}`);
                    
                    // Add uploaded files to the UI
                    addUploadedFilesToUI(uploadItems);
                }, 500);
            }
        }, delay);
    });
}

function addUploadedFilesToUI(uploadItems) {
    const allFilesTable = document.querySelector('.files-table tbody');
    
    if (allFilesTable) {
        uploadItems.forEach(item => {
            const fileName = item.querySelector('.upload-item-name').textContent;
            const fileSize = item.querySelector('.upload-item-size').textContent;
            
            // Determine file type based on extension
            const extension = fileName.split('.').pop().toLowerCase();
            let fileType = 'document';
            let icon = 'description';
            
            if (['xlsx', 'xls', 'csv'].includes(extension)) {
                fileType = 'spreadsheet';
                icon = 'table_chart';
            } else if (['pptx', 'ppt'].includes(extension)) {
                fileType = 'presentation';
                icon = 'slideshow';
            } else if (extension === 'pdf') {
                fileType = 'pdf';
                icon = 'picture_as_pdf';
            }
            
            const newRow = document.createElement('tr');
            newRow.className = 'file-row';
            newRow.setAttribute('data-type', fileType);
            
            const currentDate = new Date();
            const dateString = `${currentDate.toLocaleString('default', { month: 'short' })} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
            
            newRow.innerHTML = `
                <td>
                    <div class="file-cell">
                        <span class="material-icons">${icon}</span>
                        <span>${fileName}</span>
                    </div>
                </td>
                <td>testuser</td>
                <td>${dateString}</td>
                <td>${fileSize}</td>
                <td>
                    <div class="actions">
                        <button class="icon-button"><span class="material-icons">share</span></button>
                        <button class="icon-button"><span class="material-icons">more_vert</span></button>
                    </div>
                </td>
            `;
            
            allFilesTable.prepend(newRow);
        });
        
        // Setup interactions for the new files
        setupFileInteractions();
    }
}

function setupFileInteractions() {
    // Make all file rows clickable
    const fileRows = document.querySelectorAll('.file-row');
    fileRows.forEach(row => {
        // Double click to open
        row.addEventListener('dblclick', function() {
            const fileName = this.querySelector('.file-cell span:nth-child(2)').textContent;
            const fileType = this.getAttribute('data-type');
            
            if (fileType === 'folder') {
                // Simulate folder navigation
                showNotification(`Opening folder: ${fileName}`);
            } else {
                // Simulate file opening
                showNotification(`Opening file: ${fileName}`);
            }
        });
        
        // Right click for context menu
        row.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            showContextMenu(e.clientX, e.clientY, this);
        });
    });
    
    // Make all file items in grid clickable
    const fileItems = document.querySelectorAll('.file-item');
    fileItems.forEach(item => {
        // Double click to open
        item.addEventListener('dblclick', function() {
            const fileName = this.querySelector('.file-name').textContent;
            const fileType = this.getAttribute('data-type');
            
            if (fileType === 'folder') {
                // Simulate folder navigation
                showNotification(`Opening folder: ${fileName}`);
            } else {
                // Simulate file opening
                showNotification(`Opening file: ${fileName}`);
            }
        });
        
        // Right click for context menu
        item.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            showContextMenu(e.clientX, e.clientY, this);
        });
    });
}

function setupContextMenu() {
    // Hide context menu on click outside
    document.addEventListener('click', function() {
        hideContextMenu();
    });
    
    // Setup context menu actions
    const contextMenu = document.getElementById('context-menu');
    if (contextMenu) {
        const menuItems = contextMenu.querySelectorAll('li');
        
        menuItems.forEach(item => {
            item.addEventListener('click', function() {
                const action = this.textContent.trim();
                const targetElement = contextMenu.getAttribute('data-target');
                const target = document.querySelector(targetElement);
                
                if (target) {
                    let fileName;
                    if (target.classList.contains('file-row')) {
                        fileName = target.querySelector('.file-cell span:nth-child(2)').textContent;
                    } else if (target.classList.contains('file-item')) {
                        fileName = target.querySelector('.file-name').textContent;
                    }
                    
                    if (fileName) {
                        if (action.includes('Preview')) {
                            showNotification(`Previewing ${fileName}`);
                        } else if (action.includes('Share')) {
                            showNotification(`Share dialog for ${fileName}`);
                        } else if (action.includes('Download')) {
                            showNotification(`Downloading ${fileName}`);
                        } else if (action.includes('Rename')) {
                            renameFile(target, fileName);
                        } else if (action.includes('Remove')) {
                            removeFile(target, fileName);
                        }
                    }
                }
                
                hideContextMenu();
            });
        });
    }
}

function showContextMenu(x, y, targetElement) {
    const contextMenu = document.getElementById('context-menu');
    
    if (contextMenu) {
        // Position the menu
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
        
        // Store reference to target element
        const targetId = `target-${Date.now()}`;
        targetElement.id = targetId;
        contextMenu.setAttribute('data-target', `#${targetId}`);
        
        // Show the menu
        contextMenu.style.display = 'block';
    }
}

function hideContextMenu() {
    const contextMenu = document.getElementById('context-menu');
    
    if (contextMenu) {
        contextMenu.style.display = 'none';
    }
}

function renameFile(targetElement, currentName) {
    const newName = prompt('Enter new name:', currentName);
    
    if (newName && newName !== currentName) {
        // Update UI
        if (targetElement.classList.contains('file-row')) {
            const nameElement = targetElement.querySelector('.file-cell span:nth-child(2)');
            nameElement.textContent = newName;
        } else if (targetElement.classList.contains('file-item')) {
            const nameElement = targetElement.querySelector('.file-name');
            nameElement.textContent = newName;
        }
        
        showNotification(`Renamed to ${newName}`);
    }
}

function removeFile(targetElement, fileName) {
    const confirmDelete = confirm(`Are you sure you want to remove "${fileName}"?`);
    
    if (confirmDelete) {
        // Remove from UI with animation
        targetElement.style.opacity = '0';
        targetElement.style.height = '0';
        targetElement.style.overflow = 'hidden';
        targetElement.style.transition = 'opacity 0.3s, height 0.3s';
        
        setTimeout(() => {
            targetElement.remove();
            showNotification(`Removed ${fileName}`);
        }, 300);
    }
}

function showNotification(message) {
    // Check if notification container exists
    let notificationContainer = document.querySelector('.notification-container');
    
    if (!notificationContainer) {
        // Create notification container
        notificationContainer = document.createElement('div');
        notificationContainer.className = 'notification-container';
        document.body.appendChild(notificationContainer);
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .notification-container {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
            }
            
            .notification {
                background-color: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 12px 16px;
                border-radius: 4px;
                margin-top: 8px;
                font-size: 14px;
                backdrop-filter: blur(8px);
                transition: opacity 0.3s, transform 0.3s;
                opacity: 0;
                transform: translateY(20px);
            }
            
            .notification.show {
                opacity: 1;
                transform: translateY(0);
            }
        `;
        document.head.appendChild(style);
    }
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    // Add to container
    notificationContainer.appendChild(notification);
    
    // Show with animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Remove after timeout
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Add placeholder image for logo
function setupLogo() {
    const logoImg = document.querySelector('.logo img');
    if (logoImg && !logoImg.complete) {
        logoImg.onerror = function() {
            this.onerror = null;
            this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iNCIgZmlsbD0iIzFhNzNlOCIvPgo8cGF0aCBkPSJNMjAgMzBMMzAgMjBMMjAgMTBMMTAgMjBMMjAgMzBaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4=';
        };
    }
}

// Call setup logo on load
window.addEventListener('load', setupLogo);
