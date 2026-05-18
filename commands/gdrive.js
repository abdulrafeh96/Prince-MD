'use strict';

const { google } = require('googleapis');

const DRIVE_API_KEY = process.env.DRIVE_API_KEY || 'AIzaSyBS3_R-QolPsRYDtg3r2oQAywrqYd9amC4';
const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID || '1gSVhMnuw4rQYtXZ8XgAThnG9FaESCVPR';
const DRIVE_FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';
const STUDENT_GROUP_LINK = process.env.STUDENT_GROUP_LINK || 'https://chat.whatsapp.com/DWDY0Fw7wod3WGeNVoaqRB';
const TERM_FILES_DEBUG = process.env.TERM_FILES_DEBUG === 'true';

const drive = google.drive({
  version: 'v3',
  auth: DRIVE_API_KEY,
});

function debugTermFiles(...args) {
  if (!TERM_FILES_DEBUG) return;
  console.log('[TERM_FILES_DEBUG]', ...args);
}

function escapeDriveQueryValue(value = '') {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function normalizeLookupText(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSubjectCodes(text = '') {
  const matches = String(text).match(/[a-zA-Z]{2,4}\d{3}/g) || [];
  return [...new Set(matches.map((match) => match.toUpperCase()))];
}

function detectTermType(text = '') {
  const normalized = normalizeLookupText(text);

  if (/\b(mid(?: term)?|mid-term|midterm)\b/.test(normalized)) return 'mid';
  if (/\b(final(?: term)?|final-term|finalterm)\b/.test(normalized)) return 'final';

  return null;
}

function getTermFolderKeywords(termType) {
  if (termType === 'mid') return ['mid term', 'midterm', 'mid-term', 'mid terms'];
  if (termType === 'final') return ['final term', 'finalterm', 'final-term', 'final terms'];
  return [];
}

function getPapersFolderKeywords() {
  return ['past papers', 'pastpapers', 'past paper', 'papers', 'paper'];
}

function getHandoutsFolderKeywords() {
  return ['handouts', 'handout', 'highlighted handouts'];
}

async function listDriveChildren(parentId, queryParts = []) {
  try {
    const q = [`'${parentId}' in parents`, 'trashed = false', ...queryParts].join(' and ');
    const files = [];
    let pageToken;
    let pages = 0;

    do {
      const res = await drive.files.list({
        q,
        pageSize: 1000,
        pageToken,
        fields: 'nextPageToken, files(id, name, mimeType)',
      });

      files.push(...(res.data.files || []));
      pageToken = res.data.nextPageToken;
      pages += 1;
    } while (pageToken);

    debugTermFiles('listDriveChildren', { parentId, queryParts, pages, itemCount: files.length });
    return files;
  } catch (err) {
    console.log('Drive Error:', err?.message || err);
    return [];
  }
}

async function findDriveFolderByName(parentId, folderNameKeywords) {
  const folders = await listDriveChildren(parentId, [`mimeType = '${DRIVE_FOLDER_MIME_TYPE}'`]);
  const normalizedKeywords = folderNameKeywords.map(normalizeLookupText).filter(Boolean);
  const matchedFolder = folders.find((folder) => {
    const normalizedName = normalizeLookupText(folder.name);
    return normalizedKeywords.some((keyword) => normalizedName.includes(keyword));
  }) || null;

  debugTermFiles('findDriveFolderByName', {
    parentId,
    keywords: folderNameKeywords,
    scannedFolders: folders.length,
    matchedFolder: matchedFolder ? { id: matchedFolder.id, name: matchedFolder.name } : null,
  });

  return matchedFolder;
}

async function findTermSubjectFiles(termType, subject) {
  const termKeywords = getTermFolderKeywords(termType);
  const termFolder = await findDriveFolderByName(DRIVE_FOLDER_ID, termKeywords);
  if (!termFolder?.id) return [];

  const subjectFolder = await findDriveFolderByName(termFolder.id, [subject]);
  if (!subjectFolder?.id) return [];

  return listDriveChildren(subjectFolder.id, [`mimeType != '${DRIVE_FOLDER_MIME_TYPE}'`]);
}

async function findPaperSubjectFiles(termType, subject) {
  const termKeywords = getTermFolderKeywords(termType);
  const handoutsFolder = await findDriveFolderByName(DRIVE_FOLDER_ID, getHandoutsFolderKeywords());
  if (!handoutsFolder?.id) return [];

  const papersFolder = await findDriveFolderByName(handoutsFolder.id, getPapersFolderKeywords());
  if (!papersFolder?.id) return [];

  const termFolder = await findDriveFolderByName(papersFolder.id, termKeywords);
  if (!termFolder?.id) return [];

  const subjectFolder = await findDriveFolderByName(termFolder.id, [subject]);
  if (!subjectFolder?.id) return [];

  return listDriveChildren(subjectFolder.id, [`mimeType != '${DRIVE_FOLDER_MIME_TYPE}'`]);
}

async function findHandouts(subject) {
  const files = await listDriveChildren(DRIVE_FOLDER_ID, [
    `mimeType != '${DRIVE_FOLDER_MIME_TYPE}'`,
    `name contains '${escapeDriveQueryValue(subject)}'`,
  ]);

  return files.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
}

function driveDownloadUrl(fileId) {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

function studentGroupFooter() {
  return `\n\nSupport us by joining this group:\n${STUDENT_GROUP_LINK}`;
}

function cleanDriveCaption() {
  return '';
}

function missingTermText(subject, termType) {
  const termName = termType === 'mid' ? 'Mid Term' : 'Final Term';
  return [
    '╭─── *FILE STATUS* ───╮',
    '',
    '✦ *Status*   : Not Available',
    `✦ *Type*     : ${termName} Files`,
    `✦ *Subject*  : ${subject}`,
    '',
    'File abhi Drive mein upload nahi hui.',
    'Jaldi add ho jaye gi, thora sabar karo.',
    '',
    '╰────────────────────╯',
    studentGroupFooter().trimStart(),
  ].join('\n');
}

function missingPaperText(subject, termType) {
  const termName = termType === 'mid' ? 'Mid Term' : 'Final Term';
  return [
    '╭─── *FILE STATUS* ───╮',
    '',
    '✦ *Status*   : Not Available',
    `✦ *Type*     : ${termName} Past Papers`,
    `✦ *Subject*  : ${subject}`,
    '',
    'Past papers abhi Drive mein upload nahi hoye.',
    'Jaldi add ho jaye ge, thora sabar karo.',
    '',
    '╰────────────────────╯',
    studentGroupFooter().trimStart(),
  ].join('\n');
}

function missingHandoutText(subject) {
  return [
    '╭─── *FILE STATUS* ───╮',
    '',
    '✦ *Status*   : Not Available',
    '✦ *Type*     : Handouts',
    `✦ *Subject*  : ${subject}`,
    '',
    'Handouts abhi Drive mein upload nahi hoye.',
    'Jaldi add ho jaye ge, thora sabar karo.',
    '',
    '╰────────────────────╯',
    studentGroupFooter().trimStart(),
  ].join('\n');
}

function buildTotalSentMessage({ sentCount, label, subject, doneLine = 'Files pohanch gayi ne, paaji.' }) {
  const deliveryLine = doneLine;
  return [
    '╭── *DELIVERY REPORT* ──╮',
    '',
    '✦ *Status*     : Delivered',
    `✦ *Type*       : ${label}`,
    `✦ *Subject*    : ${subject}`,
    `✦ *Total Sent* : ${sentCount}`,
    '',
    deliveryLine,
    '',
    '╰──────────────────────╯',
    studentGroupFooter().trimStart(),
  ].join('\n');
}

function missingPaperStatusText(subject, termType) {
  const termName = termType === 'mid' ? 'Mid Term' : 'Final Term';
  return [
    '╭─── *FILE STATUS* ───╮',
    '',
    '✦ *Status*   : Not Available',
    `✦ *Type*     : ${termName} Past Papers`,
    `✦ *Subject*  : ${subject}`,
    '',
    'Past papers abhi Drive mein upload nahi hoye.',
    'Jaldi add ho jaye ge, thora sabar karo.',
    '',
    '╰────────────────────╯',
    studentGroupFooter().trimStart(),
  ].join('\n');
}

async function sendDriveFile(sock, jid, file, caption, quotedMsg) {
  return sock.sendMessage(jid, {
    document: { url: driveDownloadUrl(file.id) },
    mimetype: file.mimeType || 'application/octet-stream',
    fileName: file.name || 'drive-file',
    caption: cleanDriveCaption(caption),
  }, quotedMsg ? { quoted: quotedMsg } : undefined);
}

async function sendDriveFiles(ctx, files, caption) {
  const { sock, msg, from } = ctx;
  let sentCount = 0;

  for (const file of files) {
    try {
      await sendDriveFile(sock, from, file, caption, msg);
      sentCount += 1;
    } catch (err) {
      console.log('Drive Send Error:', {
        fileId: file?.id,
        fileName: file?.name,
        error: err?.message || err,
      });
    }
  }

  return sentCount;
}

async function sendTotalMessage(ctx, text) {
  return ctx.sock.sendMessage(ctx.from, { text }, { quoted: ctx.msg });
}

async function handleDriveRequest(ctx, text, options = {}) {
  const { sock, msg, from } = ctx;
  const normalizedText = String(text || '').trim();
  const lowerText = normalizedText.toLowerCase();
  const textWithoutUrls = lowerText.replace(/https?:\/\/\S+/g, ' ');
  const subjectCodes = getSubjectCodes(lowerText);
  const termType = detectTermType(lowerText);
  const wantsHandouts = /\b(handouts?|highlight(?:ed|s)?\s*handouts?|bookan|kitaaban|kitaban)\b/i.test(textWithoutUrls);
  const wantsPapers = options.forcePapers || /\b(past\s*papers?|pastpapers?|papers?|paper)\b/i.test(textWithoutUrls);
  const wantsFiles = options.forceTermFiles || /\b(files?|send)\b/i.test(lowerText);

  debugTermFiles('incomingTermRequestCheck', {
    text: normalizedText,
    termType,
    subjectCodes,
    wantsFiles,
    wantsHandouts,
    wantsPapers,
  });

  if (termType && subjectCodes.length > 0 && wantsPapers) {
    let totalSent = 0;
    const deliveredSubjects = [];

    for (const subject of subjectCodes) {
      const files = await findPaperSubjectFiles(termType, subject);

      if (files.length > 0) {
        const sentCount = await sendDriveFiles(ctx, files, 'PAST PAPERS');
        totalSent += sentCount;
        deliveredSubjects.push(subject);
      } else {
        await sock.sendMessage(from, { text: missingPaperStatusText(subject, termType) }, { quoted: msg });
      }
    }

    if (totalSent > 0) {
      const termName = termType === 'mid' ? 'Mid Term' : 'Final Term';
      await sendTotalMessage(ctx, buildTotalSentMessage({
        sentCount: totalSent,
        label: `${termName} Past Papers`,
        subject: deliveredSubjects.join(', '),
        doneLine: 'Past papers pohanch gaye ne, paaji.',
      }));
    }

    return true;
  }

  if (termType && subjectCodes.length > 0 && wantsFiles) {
    let totalSent = 0;
    const deliveredSubjects = [];

    for (const subject of subjectCodes) {
      const files = await findTermSubjectFiles(termType, subject);

      if (files.length > 0) {
        const sentCount = await sendDriveFiles(ctx, files, 'FILES');
        totalSent += sentCount;
        deliveredSubjects.push(subject);
      } else {
        await sock.sendMessage(from, { text: missingTermText(subject, termType) }, { quoted: msg });
      }
    }

    if (totalSent > 0) {
      const termName = termType === 'mid' ? 'Mid Term' : 'Final Term';
      await sendTotalMessage(ctx, buildTotalSentMessage({
        sentCount: totalSent,
        label: `${termName} Files`,
        subject: deliveredSubjects.join(', '),
      }));
    }

    return true;
  }

  if (wantsHandouts) {
    if (subjectCodes.length === 0) return false;

    let totalSent = 0;
    const deliveredSubjects = [];

    for (const subject of subjectCodes) {
      const files = await findHandouts(subject);

      if (files.length > 0) {
        const sentCount = await sendDriveFiles(ctx, files, 'HANDOUT');
        totalSent += sentCount;
        deliveredSubjects.push(subject);
      } else {
        await sock.sendMessage(from, { text: missingHandoutText(subject) }, { quoted: msg });
      }
    }

    if (totalSent > 0) {
      await sendTotalMessage(ctx, buildTotalSentMessage({
        sentCount: totalSent,
        label: 'Handouts',
        subject: deliveredSubjects.join(', '),
      }));
    }

    return true;
  }

  return false;
}

async function handleAutoDrive(ctx) {
  try {
    return await handleDriveRequest(ctx, ctx.body);
  } catch (err) {
    console.log('File Request Error:', err?.message || err);
    await ctx.sock.sendMessage(ctx.from, {
      text: 'Oops! Something went wrong while fetching your files. Please try again later.',
    }, { quoted: ctx.msg });
    return true;
  }
}

async function handouts(ctx) {
  const query = ctx.args.join(' ');
  if (!query) return ctx.reply('Usage: .handouts CS101');
  const handled = await handleDriveRequest(ctx, `handouts ${query}`);
  if (!handled) await ctx.reply('Subject code nahi mila. Example: .handouts CS101');
}

async function termfiles(ctx) {
  const query = ctx.args.join(' ');
  if (!query) return ctx.reply('Usage: .termfiles mid CS101');
  const handled = await handleDriveRequest(ctx, `${query} files`, { forceTermFiles: true });
  if (!handled) await ctx.reply('Example: .termfiles mid CS101 ya .termfiles final CS101');
}

async function papers(ctx) {
  const query = ctx.args.join(' ');
  if (!query) return ctx.reply('Usage: .papers CS101 midterm');
  const handled = await handleDriveRequest(ctx, `${query} papers`, { forcePapers: true });
  if (!handled) await ctx.reply('Example: .papers CS101 midterm ya .pastpapers CS101 finalterm');
}

module.exports = {
  handleAutoDrive,
  handouts,
  termfiles,
  papers,
  findHandouts,
  findTermSubjectFiles,
  findPaperSubjectFiles,
};

