const { ipcRenderer } = require('electron');
console.log('renderer.js loaded');
const titleElement = document.getElementById('title');
const statusElement = document.getElementById('status');
const syncTab = document.getElementById('sync-tab');
const historyTab = document.getElementById('history-tab');
const remoteTab = document.getElementById('remote-tab');
const syncContent = document.getElementById('sync-content');
const historyContent = document.getElementById('history-content');
const historyTableBody = document.querySelector('#history-content tbody');
const remoteContent = document.getElementById('remote-content');
const remoteTableBody = document.querySelector('#remote-content tbody');

document.getElementById('btn-local').addEventListener('click', () => {
  ipcRenderer.send('btn-local-sync');
});

document.getElementById('btn-remote').addEventListener('click', () => {
  ipcRenderer.send('btn-remote-sync');
});

// When a file is modified or deleted, update the UI
ipcRenderer.on('file-modified', (event, data) => {
  const { filePath } = data;
  const fileEvent = data.event === 'add' ? 'added' : 'modified';
  console.log(`File ${filePath} has been ${fileEvent}`);
  // Update UI to show that sync is in progress
  statusElement.textContent = 'Syncing...';

  // Read the file from the main process and display it
  ipcRenderer.send('read-file', data);
});

ipcRenderer.on('file-read-success', (event, fileData, fileContent) => {
  const { filePath, event: fileEvent } = fileData;
  // Display the file content in the sync tab
  syncContent.innerHTML = `<pre>${fileContent}</pre>`;
  addRowTable(filePath, new Date().toLocaleString(), `${fileEvent}`.toUpperCase());
  // Update UI to show that sync is complete
  statusElement.textContent = 'Sync Complete';
});

ipcRenderer.on('file-read-error', (event, filePath) => {
  // Display an error message in the sync tab
  syncContent.innerHTML = '<p>Error reading file</p>';
  addRowTable(filePath, new Date().toLocaleString(), 'Sync Error');
  // Update UI to show that sync is complete
  statusElement.textContent = 'Sync Complete';
});

ipcRenderer.on('file-deleted', (event, filePath) => {
  // Display a message in the sync tab
  syncContent.innerHTML = `<p>${filePath} has been deleted</p>`;
  addRowTable(filePath, new Date().toLocaleString(), 'DELETED');
  // Update UI to show that sync is complete
  statusElement.textContent = 'Sync Complete';
});

// When sync is complete, update the UI
ipcRenderer.on('sync-complete', (event) => {
  // Add a row to the history table
  const row = historyTableBody.insertRow(0);
  const namefileCell = row.insertCell(0);
  const dateCell = row.insertCell(1);
  const statusCell = row.insertCell(2);
  
  namefileCell.textContent = titleElement.textContent;
  dateCell.textContent = new Date().toLocaleString();
  statusCell.textContent = 'Synced Files';

  // Update UI to show that sync is complete
  statusElement.textContent = 'Sync Complete';
  syncContent.textContent = '';
});

ipcRenderer.on('file-remote', (event, namefile, size, date) => {
  addRowTableRemote(namefile, size, date);
  statusElement.textContent = 'Sync Complete';
});

ipcRenderer.on('restartTable', (event) => {
  restartTable();
});

// Switch tabs
syncTab.addEventListener('click', () => {
  syncTab.classList.add('active');
  historyTab.classList.remove('active');
  remoteTab.classList.remove('active');
  syncContent.style.display = 'block';
  historyContent.style.display = 'none';
  remoteContent.style.display = 'none';
});

historyTab.addEventListener('click', () => {
  historyTab.classList.add('active');
  syncTab.classList.remove('active');
  remoteTab.classList.remove('active');
  historyContent.style.display = 'block';
  syncContent.style.display = 'none';
  remoteContent.style.display = 'none';
});

remoteTab.addEventListener('click', () => {
  remoteTab.classList.add('active');
  syncTab.classList.remove('active');
  historyTab.classList.remove('active');
  remoteContent.style.display = 'block';
  syncContent.style.display = 'none';
  historyContent.style.display = 'none';
});

// function add row table
function addRowTable(namefile, date, status) {
  const row = historyTableBody.insertRow(0);
  const namefileCell = row.insertCell(0);
  const dateCell = row.insertCell(1);
  const statusCell = row.insertCell(2);
  
  namefileCell.textContent = namefile;
  dateCell.textContent = date;
  statusCell.textContent = status;
}

function addRowTableRemote(namefile, size, date) {
  const row = remoteTableBody.insertRow(0);
  const namefileCell = row.insertCell(0);
  const sizeCell = row.insertCell(1);
  const dateCell = row.insertCell(2);
  
  namefileCell.textContent = namefile;
  sizeCell.textContent = size;
  dateCell.textContent = new Date(date).toLocaleString();
}

function restartTable() {
  var tb = document.getElementById('table-remote');
  for(var i = 1; i < tb.rows.length;) {   
    tb.deleteRow(i);
  }
}

document.getElementById('btn-minimize').addEventListener('click', () => {
  ipcRenderer.send('window-minimize');
});

document.getElementById('btn-maximize').addEventListener('click', () => {
  ipcRenderer.send('window-maximize');
});

document.getElementById('btn-close').addEventListener('click', () => {
  ipcRenderer.send('window-close');
});