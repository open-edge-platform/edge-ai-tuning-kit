// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0

import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Gets real-time CPU usage on Linux systems
 * Uses top command to get current CPU usage
 */
async function getCpuUsage() {
  try {
    // Run top in batch mode with one iteration to get current CPU usage
    // -b: batch mode, -n1: one iteration, -i: ignore idle processes
    const { stdout } = await execAsync('top -b -n1 | grep "%Cpu(s)"');
    
    // Parse the output which has format like:
    // %Cpu(s):  5.9 us,  2.4 sy,  0.0 ni, 91.8 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
    const parts = stdout.split(',');
    
    // Extract idle percentage
    const idlePart = parts.find(part => part.includes('id'));
    const idlePercentage = idlePart ? parseFloat(idlePart.replace(/[^\d.]/g, '')) : 0;
    
    // Usage is 100 - idle
    const usage = 100 - idlePercentage;
    
    return { usage };
  } catch (error) {
    console.error('Error getting CPU usage:', error);
    return { usage: 0 };
  }
}

/**
 * GET handler for retrieving real-time CPU usage
 * @returns JSON response with current CPU usage percentage
 */
export async function GET() {
  try {
    const cpuUsage = await getCpuUsage();
    return NextResponse.json(cpuUsage);
  } catch (error) {
    console.error('Error retrieving CPU usage:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve CPU usage', usage: 0 },
      { status: 500 }
    );
  }
}
