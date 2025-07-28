// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0

import { NextResponse } from 'next/server';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Generates mock disk data because Node.js doesn't provide direct disk usage APIs
 * In a real application, this would use OS-specific commands or libraries
 */
async function getDiskInfo() {
  try {
    // Get information about the largest disk using lsblk
    const { stdout: diskInfo } = await execAsync('lsblk -d -o NAME,SIZE -b | sort -k2 -nr | head -1');
    // Parse the output which has format like:
    // sda    500107862016
    const diskParts = diskInfo.trim().split(/\s+/);
    const totalSizeBytes = parseInt(diskParts[1], 10);
    
    // Now get usage information using df for the root filesystem
    const { stdout: dfOutput } = await execAsync('df -B1 / | tail -1');
    // Parse the df output which has format like:
    // /dev/sda1  500107862016  294975000000  191107862016  61% /
    const dfParts = dfOutput.trim().split(/\s+/);
    
    // df output format positions:
    // 0: device (e.g., "/dev/sda1")
    // 1: total size in bytes (e.g., "500107862016")
    // 2: used space in bytes (e.g., "294975000000")
    // 3: available space in bytes (e.g., "191107862016") 
    // 4: usage percentage (e.g., "61%")
    
    // Convert bytes to human-readable format
    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return '0B';
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + sizes[i];
    };
    
    const total = formatBytes(totalSizeBytes) || '0';
    const used = formatBytes(parseInt(dfParts[2], 10)) || '0';
    const free = formatBytes(parseInt(dfParts[3], 10)) || '0';
    const usagePercentage = dfParts[4] || '0%';

    return {
      total,
      free,
      used,
      usagePercentage
    };
  } catch (error) {
    console.error('Error getting disk information:', error);
    return {
      total: '0',
      free: '0',
      used: '0',
      usagePercentage: '0%'
    };
  }
}

/**
 * Generates mock network data because Node.js doesn't provide direct network usage APIs
 * In a real application, this would use OS-specific commands or libraries
 */
async function getNetworkInfo() {
  try {
    // Format the bytes into human-readable format
    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
    };
    
    // Use /proc/net/dev to get network statistics on Linux
    const { stdout } = await execAsync('cat /proc/net/dev');
    
    // Parse the output - skip the first two lines (headers)
    const lines = stdout.trim().split('\n').slice(2);
    
    // Calculate total inbound and outbound data
    let totalInbound = 0;
    let totalOutbound = 0;
    
    // Process each interface
    const interfaces = Object.entries(os.networkInterfaces()).map(([name, info]) => {
      // Find the corresponding line in /proc/net/dev
      const interfaceLine = lines.find(line => line.includes(name));
      let inBytes = 0;
      let outBytes = 0;
      
      if (interfaceLine) {
        // Format of each line:
        // Interface: rx_bytes rx_packets rx_errs rx_drop rx_fifo rx_frame rx_compressed rx_multicast tx_bytes tx_packets ...
        const parts = interfaceLine.trim().split(/\s+/);
        
        // rx_bytes is the received bytes (index 1 after interface name)
        // tx_bytes is the transmitted bytes (index 9 after interface name)
        inBytes = parseInt(parts[1], 10);
        outBytes = parseInt(parts[9], 10);
        
        totalInbound += inBytes;
        totalOutbound += outBytes;
      }
      
      return {
        name,
        traffic: {
          inbound: formatBytes(inBytes) + '/s',
          outbound: formatBytes(outBytes) + '/s'
        },
        addresses: info?.map(addr => ({
          address: addr.address,
          family: addr.family,
          internal: addr.internal
        })) || []
      };
    });
    
    return {
      inbound: formatBytes(totalInbound) + '/s',
      outbound: formatBytes(totalOutbound) + '/s',
      totalTraffic: formatBytes(totalInbound + totalOutbound) + '/s',
      interfaces
    };
  } catch (error) {
    console.error('Error getting network information:', error);
    return {
      inbound: '0 B/s',
      outbound: '0 B/s',
      totalTraffic: '0 B/s',
      interfaces: Object.entries(os.networkInterfaces()).map(([name, info]) => ({
        name,
        traffic: {
          inbound: '0 B/s',
          outbound: '0 B/s'
        },
        addresses: info?.map(addr => ({
          address: addr.address,
          family: addr.family,
          internal: addr.internal
        })) || []
      }))
    };
  }
}

/**
 * GET handler for retrieving system information
 * @returns JSON response with CPU, RAM, Disk, and Network information
 */
export async function GET() {
  try {
    // Get CPU information
    const cpuInfo = os.cpus();
    const cpuModel = cpuInfo.length > 0 ? cpuInfo[0].model : 'Unknown CPU';
    const cpuCores = cpuInfo.length;
    
    // Get RAM information
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    // Format memory sizes to GB with 2 decimal places
    const formatMemory = (bytes: number): string => {
      return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
    };
    
    // Additional system information
    const hostname = os.hostname();
    const platform = os.platform();
    const release = os.release();
    const uptime = (os.uptime() / 3600).toFixed(2) + ' hours';
    
    // Get disk and network information
    const diskInfo = await getDiskInfo();
    const networkInfo = await getNetworkInfo();
    
    const systemInfo = {
      cpu: {
        model: cpuModel,
        cores: cpuCores,
        architecture: os.arch()
      },
      memory: {
        total: formatMemory(totalMemory),
        free: formatMemory(freeMemory),
        used: formatMemory(usedMemory),
        usagePercentage: ((usedMemory / totalMemory) * 100).toFixed(2) + '%'
      },
      system: {
        hostname,
        platform,
        release,
        uptime
      },
      disk: diskInfo,
      network: networkInfo
    };
    
    return NextResponse.json(systemInfo);
  } catch (error) {
    console.error('Error retrieving system information:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve system information' },
      { status: 500 }
    );
  }
}
