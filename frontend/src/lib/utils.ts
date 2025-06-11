// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  // Less than a minute
  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  }
  
  // Less than an hour
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  
  // Less than a day
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }
  
  // Less than a month
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  }
  
  // Less than a year
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
  }
  
  // More than a year
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`;
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDistance(date: Date, baseDate: Date, options?: { addSuffix?: boolean }) {
  const now = baseDate || new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  let result = '';
  
  // Less than a minute
  if (diffInSeconds < 60) {
    result = `${diffInSeconds} seconds`;
  }
  // Less than an hour
  else {
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      result = `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'}`;
    }
    // Less than a day
    else {
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) {
        result = `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'}`;
      }
      // Less than a month
      else {
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 30) {
          result = `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'}`;
        }
        // Less than a year
        else {
          const diffInMonths = Math.floor(diffInDays / 30);
          if (diffInMonths < 12) {
            result = `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'}`;
          }
          // More than a year
          else {
            const diffInYears = Math.floor(diffInDays / 365);
            result = `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'}`;
          }
        }
      }
    }
  }
  
  return options?.addSuffix ? result + ' ago' : result;
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

