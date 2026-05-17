// ============================================
//      Prince Md — COMMANDS/NUMBERTRACKER.JS
//      Mobile Number Tracker
// ============================================

'use strict';

const axios = require('axios');
const { toSmallCaps } = require('../utils/fonts');

// ─── .numbertracker ────────────────────────────────────────────
const numbertracker = async (ctx) => {
  const { sock, msg, from, sender, args } = ctx;

  const number = args[0];
  if (!number) {
    return ctx.reply(`❌ *${toSmallCaps('provide a mobile number')}*\n\n*Example:* .numbertracker 923001234567\n*Example:* .numbertracker +923001234567`);
  }

  // Clean the number
  const cleanNumber = number.replace(/[^0-9]/g, '');
  if (cleanNumber.length < 10 || cleanNumber.length > 15) {
    return ctx.reply(`❌ *${toSmallCaps('invalid mobile number')}*\n\n${toSmallCaps('please provide a valid mobile number')}`);
  }

  await ctx.reply(`🔍 *${toSmallCaps('tracking mobile number')}* ${cleanNumber}...`);

  try {
    // Mock number tracking data (in real implementation, you'd use a number tracking API)
    const countryData = getCountryFromNumber(cleanNumber);
    const operatorData = getOperatorFromNumber(cleanNumber);
    const typeData = getNumberType(cleanNumber);

    let responseText = `📱 *${toSmallCaps('mobile number tracker')}*\n\n`;
    responseText += `🔢 *${toSmallCaps('number')}:* ${cleanNumber}\n`;
    responseText += `🌍 *${toSmallCaps('country')}:* ${countryData.country}\n`;
    responseText += `🏳️ *${toSmallCaps('country code')}:* ${countryData.code}\n`;
    responseText += `📡 *${toSmallCaps('operator')}:* ${operatorData.operator}\n`;
    responseText += `📶 *${toSmallCaps('network type')}:* ${operatorData.type}\n`;
    responseText += `📱 *${toSmallCaps('number type')}:* ${typeData.type}\n`;
    responseText += `🌐 *${toSmallCaps('timezone')}:* ${countryData.timezone}\n`;
    responseText += `💰 *${toSmallCaps('currency')}:* ${countryData.currency}\n\n`;
    
    responseText += `⚠️ *${toSmallCaps('disclaimer')}*\n`;
    responseText += `${toSmallCaps('this is basic number information based on country codes and operator prefixes. actual location and personal details are not accessible due to privacy laws.')}\n\n`;
    responseText += `> ${toSmallCaps('powered by Prince Md')}`;

    await ctx.reply(responseText);

  } catch (error) {
    console.log('[NUMBERTRACKER ERROR]', error.message);
    await ctx.reply(`❌ *${toSmallCaps('tracking failed')}*\n\n${toSmallCaps('please try again later')}`);
  }
};

// Helper function to get country from number
const getCountryFromNumber = (number) => {
  const countryCodes = {
    '92': { country: 'Pakistan', code: '+92', timezone: 'Asia/Karachi', currency: 'PKR' },
    '91': { country: 'India', code: '+91', timezone: 'Asia/Kolkata', currency: 'INR' },
    '1': { country: 'USA/Canada', code: '+1', timezone: 'America/New_York', currency: 'USD' },
    '44': { country: 'United Kingdom', code: '+44', timezone: 'Europe/London', currency: 'GBP' },
    '49': { country: 'Germany', code: '+49', timezone: 'Europe/Berlin', currency: 'EUR' },
    '33': { country: 'France', code: '+33', timezone: 'Europe/Paris', currency: 'EUR' },
    '81': { country: 'Japan', code: '+81', timezone: 'Asia/Tokyo', currency: 'JPY' },
    '86': { country: 'China', code: '+86', timezone: 'Asia/Shanghai', currency: 'CNY' },
    '971': { country: 'UAE', code: '+971', timezone: 'Asia/Dubai', currency: 'AED' },
    '966': { country: 'Saudi Arabia', code: '+966', timezone: 'Asia/Riyadh', currency: 'SAR' }
  };

  for (const [code, data] of Object.entries(countryCodes)) {
    if (number.startsWith(code)) {
      return data;
    }
  }

  return { country: 'Unknown', code: 'Unknown', timezone: 'Unknown', currency: 'Unknown' };
};

// Helper function to get operator from number
const getOperatorFromNumber = (number) => {
  // Mock operator detection based on number prefixes
  const operators = {
    '300': { operator: 'Mobilink (Jazz)', type: 'Mobile' },
    '301': { operator: 'Mobilink (Jazz)', type: 'Mobile' },
    '302': { operator: 'Mobilink (Jazz)', type: 'Mobile' },
    '303': { operator: 'Zong', type: 'Mobile' },
    '304': { operator: 'Zong', type: 'Mobile' },
    '305': { operator: 'Zong', type: 'Mobile' },
    '306': { operator: 'Telenor', type: 'Mobile' },
    '307': { operator: 'Telenor', type: 'Mobile' },
    '308': { operator: 'Telenor', type: 'Mobile' },
    '310': { operator: 'Warid', type: 'Mobile' },
    '311': { operator: 'Warid', type: 'Mobile' },
    '312': { operator: 'Warid', type: 'Mobile' },
    '313': { operator: 'Ufone', type: 'Mobile' },
    '314': { operator: 'Ufone', type: 'Mobile' },
    '315': { operator: 'Ufone', type: 'Mobile' },
    '316': { operator: 'Mobilink (Jazz)', type: 'Mobile' },
    '317': { operator: 'Mobilink (Jazz)', type: 'Mobile' },
    '318': { operator: 'Mobilink (Jazz)', type: 'Mobile' },
    '319': { operator: 'Zong', type: 'Mobile' },
    '320': { operator: 'Zong', type: 'Mobile' },
    '321': { operator: 'Zong', type: 'Mobile' },
    '322': { operator: 'Telenor', type: 'Mobile' },
    '323': { operator: 'Telenor', type: 'Mobile' },
    '324': { operator: 'Telenor', type: 'Mobile' },
    '325': { operator: 'Warid', type: 'Mobile' },
    '326': { operator: 'Warid', type: 'Mobile' },
    '327': { operator: 'Warid', type: 'Mobile' },
    '328': { operator: 'Ufone', type: 'Mobile' },
    '329': { operator: 'Ufone', type: 'Mobile' },
    '330': { operator: 'Ufone', type: 'Mobile' },
    '331': { operator: 'Ufone', type: 'Mobile' },
    '332': { operator: 'Ufone', type: 'Mobile' },
    '333': { operator: 'Ufone', type: 'Mobile' },
    '334': { operator: 'Ufone', type: 'Mobile' },
    '335': { operator: 'Ufone', type: 'Mobile' },
    '336': { operator: 'Ufone', type: 'Mobile' },
    '337': { operator: 'Ufone', type: 'Mobile' },
    '338': { operator: 'Ufone', type: 'Mobile' },
    '339': { operator: 'Ufone', type: 'Mobile' },
    '340': { operator: 'Ufone', type: 'Mobile' },
    '341': { operator: 'Ufone', type: 'Mobile' },
    '342': { operator: 'Ufone', type: 'Mobile' },
    '343': { operator: 'Ufone', type: 'Mobile' },
    '344': { operator: 'Ufone', type: 'Mobile' },
    '345': { operator: 'Ufone', type: 'Mobile' }
  };

  // Extract the relevant part of the number (after country code)
  let localNumber = number;
  if (number.startsWith('92')) {
    localNumber = number.substring(2);
  } else if (number.startsWith('91')) {
    localNumber = number.substring(2);
  } else if (number.startsWith('1')) {
    localNumber = number.substring(1);
  }

  // Check first 3 digits for operator
  const prefix = localNumber.substring(0, 3);
  return operators[prefix] || { operator: 'Unknown', type: 'Mobile' };
};

// Helper function to get number type
const getNumberType = (number) => {
  // Basic number type detection
  if (number.startsWith('92') || number.startsWith('91') || number.startsWith('1')) {
    return { type: 'Mobile Number' };
  }
  return { type: 'Unknown' };
};

module.exports = { numbertracker };
