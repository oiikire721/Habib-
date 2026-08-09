const { drive } = global.utils;
const { nickNameBot } = global.GoatBot.config;
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

module.exports = {
  config: {
    name: "welcome",
    version: "9.0.0",
    author: "EryXenX",
    category: "events"
  },

  langs: {
    en: {
      defaultWelcomeMessage:
        "𝗪𝗲𝗹𝗰𝗼𝗺𝗲 {userName} 🎉\n\n✦ Glad to have you here!\n✦ Enjoy your stay and make great memories 🌸",

      botAddedMessage:
        "𝐓𝐇𝐀𝐍𝐊𝐒 𝐅𝐎𝐑 𝐀𝐃𝐃𝐈𝐍𝐆 𝐌𝐄 ❤️\n\nUse -help to see all commands."
    }
  },

  onStart: async ({
    threadsData,
    message,
    event,
    api,
    usersData,
    getLang
  }) => {
    if (event.logMessageType !== "log:subscribe") return;

    const { threadID } = event;

    const threadData = await threadsData.get(threadID);
    if (!threadData.settings.sendWelcomeMessage) return;

    const addedMembers =
      event.logMessageData?.addedParticipants || [];

    const threadName =
      threadData.threadName || "Our Group";

    const prefix = global.utils.getPrefix(threadID);
    const inviterID = event.author;

    for (const user of addedMembers) {
      const userID = user.userFbId;
      const botID = api.getCurrentUserID();

      /* BOT ADDED */
      if (userID == botID) {
        if (nickNameBot) {
          try {
            await api.changeNickname(
              nickNameBot,
              threadID,
              botID
            );
          } catch (_) {}
        }

        return message.send(
          getLang("botAddedMessage", prefix)
        );
      }

      const userName =
        user.fullName || "New Member";

      let inviterName = "Someone";

      try {
        inviterName =
          await usersData.getName(inviterID);
      } catch (_) {}

      const memberCount =
        event.participantIDs?.length || 0;

      let {
        welcomeMessage = getLang(
          "defaultWelcomeMessage"
        )
      } = threadData.data || {};

      welcomeMessage = welcomeMessage
        .replace(/\{userName\}/g, userName)
        .replace(/\{userTag\}/g, userName)
        .replace(/\{threadName\}/g, threadName)
        .replace(/\{memberCount\}/g, memberCount)
        .replace(/\{inviterName\}/g, inviterName);

      let welcomeImagePath = null;

      try {
        welcomeImagePath = await createWelcomeCard({
          userName,
          threadName,
          memberCount,
          inviterName,
          newUserID: userID,
          inviterID,
          threadID,
          api
        });
      } catch (err) {
        console.error(
          "[WELCOME CARD ERROR]",
          err
        );
      }

      const form = {
        body: welcomeMessage,
        mentions: [
          {
            tag: userName,
            id: userID
          }
        ]
      };

      if (
        welcomeImagePath &&
        fs.existsSync(welcomeImagePath)
      ) {
        form.attachment =
          fs.createReadStream(welcomeImagePath);
      } else if (
        threadData.data?.welcomeAttachment
      ) {
        const attachments =
          threadData.data.welcomeAttachment.map(f =>
            drive.getFile(f, "stream")
          );

        form.attachment = (
          await Promise.allSettled(attachments)
        )
          .filter(
            x => x.status === "fulfilled"
          )
          .map(x => x.value);
      }

      await message.send(form);

      if (
        welcomeImagePath &&
        fs.existsSync(welcomeImagePath)
      ) {
        setTimeout(() => {
          try {
            fs.unlinkSync(welcomeImagePath);
          } catch (_) {}
        }, 10000);
      }
    }
  }
};


/* =========================================================
   CONFIG
========================================================= */

const ACCESS_TOKEN =
  "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";


/* =========================================================
   IMAGE DOWNLOAD
========================================================= */

async function downloadHighQualityProfile(userID) {
  try {
    const url =
      `https://graph.facebook.com/${userID}/picture` +
      `?width=800&height=800&access_token=${ACCESS_TOKEN}`;

    const res = await axios({
      method: "GET",
      url,
      responseType: "arraybuffer",
      timeout: 10000
    });

    return Buffer.from(res.data);
  } catch {
    return null;
  }
}


async function downloadImage(url) {
  try {
    const res = await axios({
      method: "GET",
      url,
      responseType: "arraybuffer",
      timeout: 10000
    });

    return Buffer.from(res.data);
  } catch {
    return null;
  }
}


async function getGroupImage(threadID, api) {
  try {
    const info =
      await api.getThreadInfo(threadID);

    if (info?.imageSrc) {
      const res = await axios({
        method: "GET",
        url: info.imageSrc,
        responseType: "arraybuffer",
        timeout: 10000
      });

      return Buffer.from(res.data);
    }
  } catch (_) {}

  return null;
}


/* =========================================================
   TEXT HELPERS
========================================================= */

function unicodeToPlain(str) {
  if (!str) return "";

  const ranges = [
    [0x1D400, 0x1D419, "A"],
    [0x1D41A, 0x1D433, "a"],
    [0x1D434, 0x1D44D, "A"],
    [0x1D44E, 0x1D467, "a"],
    [0x1D468, 0x1D481, "A"],
    [0x1D482, 0x1D49B, "a"],
    [0x1D5D4, 0x1D5ED, "A"],
    [0x1D5EE, 0x1D607, "a"],
    [0x1D63C, 0x1D655, "A"],
    [0x1D656, 0x1D66F, "a"],
    [0x1D7CE, 0x1D7D7, "0"],
    [0xFF21, 0xFF3A, "A"],
    [0xFF41, 0xFF5A, "a"],
    [0xFF10, 0xFF19, "0"],
    [0x24B6, 0x24CF, "A"],
    [0x24D0, 0x24E9, "a"]
  ];

  const singles = {
    0x1D49C: "A",
    0x212C: "B",
    0x2102: "C",
    0x2145: "D",
    0x2130: "E",
    0x2131: "F",
    0x210A: "g",
    0x210B: "H",
    0x2110: "I",
    0x2111: "I",
    0x2112: "L",
    0x2113: "l",
    0x2115: "N",
    0x2118: "P",
    0x211A: "Q",
    0x211B: "R",
    0x211C: "R",
    0x2124: "Z",
    0x2128: "Z",
    0x2070: "0",
    0x00B9: "1",
    0x00B2: "2",
    0x00B3: "3",
    0x2074: "4",
    0x2075: "5",
    0x2076: "6",
    0x2077: "7",
    0x2078: "8",
    0x2079: "9"
  };

  let result = "";

  for (const char of str) {
    const cp = char.codePointAt(0);

    if (singles[cp] !== undefined) {
      result += singles[cp];
      continue;
    }

    let mapped = false;

    for (const [start, end, base] of ranges) {
      if (cp >= start && cp <= end) {
        const baseCode =
          base.codePointAt(0);

        result += String.fromCodePoint(
          baseCode + (cp - start)
        );

        mapped = true;
        break;
      }
    }

    if (!mapped) result += char;
  }

  return result;
}


function safeStr(str) {
  if (!str) return "";

  try {
    return Buffer
      .from(String(str), "latin1")
      .toString("utf8");
  } catch {
    return String(str);
  }
}


function readableText(str) {
  return unicodeToPlain(
    safeStr(str)
  );
}


function ordinal(n) {
  n = Number(n) || 0;

  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;

  return (
    n +
    (s[(v - 20) % 10] ||
      s[v] ||
      s[0])
  );
}


/* =========================================================
   CANVAS HELPERS
========================================================= */

function roundRect(
  ctx,
  x,
  y,
  w,
  h,
  r
) {
  r = Math.min(
    r,
    w / 2,
    h / 2
  );

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);

  ctx.quadraticCurveTo(
    x + w,
    y,
    x + w,
    y + r
  );

  ctx.lineTo(
    x + w,
    y + h - r
  );

  ctx.quadraticCurveTo(
    x + w,
    y + h,
    x + w - r,
    y + h
  );

  ctx.lineTo(x + r, y + h);

  ctx.quadraticCurveTo(
    x,
    y + h,
    x,
    y + h - r
  );

  ctx.lineTo(x, y + r);

  ctx.quadraticCurveTo(
    x,
    y,
    x + r,
    y
  );

  ctx.closePath();
}


function drawCircleAvatar(
  ctx,
  img,
  cx,
  cy,
  r
) {
  ctx.save();

  ctx.beginPath();
  ctx.arc(
    cx,
    cy,
    r,
    0,
    Math.PI * 2
  );
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(
    img,
    cx - r,
    cy - r,
    r * 2,
    r * 2
  );

  ctx.restore();
}


function fitText(
  ctx,
  text,
  maxPx,
  maxSize = 34,
  minSize = 14,
  bold = true
) {
  let t = String(text || "");
  let size = maxSize;

  const weight =
    bold ? "bold" : "400";

  ctx.font =
    `${weight} ${size}px "Segoe UI", Arial`;

  while (
    ctx.measureText(t).width > maxPx &&
    size > minSize
  ) {
    size--;

    ctx.font =
      `${weight} ${size}px "Segoe UI", Arial`;
  }

  if (
    ctx.measureText(t).width > maxPx
  ) {
    while (
      ctx.measureText(t + "…").width >
        maxPx &&
      t.length > 1
    ) {
      t = t.slice(0, -1);
    }

    t += "…";
  }

  return {
    text: t,
    size
  };
}


/* =========================================================
   PREMIUM WELCOME CARD
========================================================= */

async function createWelcomeCard({
  userName,
  threadName,
  memberCount,
  inviterName,
  newUserID,
  inviterID,
  threadID,
  api
}) {
  const W = 1400;
  const H = 760;

  const canvas =
    createCanvas(W, H);

  const ctx =
    canvas.getContext("2d");


  /* -------------------------------------------------------
     LOAD IMAGES
  ------------------------------------------------------- */

  async function loadProfile(uid) {
    const buf =
      await downloadHighQualityProfile(uid);

    if (buf) {
      try {
        return await loadImage(buf);
      } catch (_) {}
    }

    try {
      const info =
        await api.getUserInfo([uid]);

      const src =
        info?.[uid]?.thumbSrc;

      if (src) {
        const b =
          await downloadImage(src);

        if (b) {
          return await loadImage(b);
        }
      }
    } catch (_) {}

    return null;
  }


  const [
    newUserImg,
    inviterImg,
    groupImg
  ] = await Promise.all([
    loadProfile(newUserID),
    loadProfile(inviterID),
    getGroupImage(
      threadID,
      api
    ).then(async b => {
      if (!b) return null;

      try {
        return await loadImage(b);
      } catch {
        return null;
      }
    })
  ]);


  const safeUser =
    readableText(userName);

  const safeInviter =
    readableText(inviterName);

  const safeGroup =
    readableText(threadName);


  /* =======================================================
     BACKGROUND
  ======================================================= */

  const bg =
    ctx.createLinearGradient(
      0,
      0,
      W,
      H
    );

  bg.addColorStop(
    0,
    "#050711"
  );

  bg.addColorStop(
    0.45,
    "#080B18"
  );

  bg.addColorStop(
    1,
    "#03040A"
  );

  ctx.fillStyle = bg;
  ctx.fillRect(
    0,
    0,
    W,
    H
  );


  /* -------------------------------------------------------
     GLOW ORBS
  ------------------------------------------------------- */

  function glow(
    x,
    y,
    radius,
    color
  ) {
    const g =
      ctx.createRadialGradient(
        x,
        y,
        0,
        x,
        y,
        radius
      );

    g.addColorStop(
      0,
      color
    );

    g.addColorStop(
      1,
      "rgba(0,0,0,0)"
    );

    ctx.fillStyle = g;

    ctx.beginPath();
    ctx.arc(
      x,
      y,
      radius,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  glow(
    250,
    160,
    330,
    "rgba(0,255,190,0.10)"
  );

  glow(
    1110,
    180,
    390,
    "rgba(60,100,255,0.13)"
  );

  glow(
    1050,
    690,
    300,
    "rgba(190,0,255,0.08)"
  );


  /* =======================================================
     PARTICLES
  ======================================================= */

  const rng = s => {
    const x =
      Math.sin(s) * 10000;

    return (
      x - Math.floor(x)
    );
  };

  for (
    let i = 0;
    i < 420;
    i++
  ) {
    const x =
      rng(i * 2.31) * W;

    const y =
      rng(i * 4.73) * H;

    const r =
      rng(i * 7.19) * 1.6 +
      0.3;

    ctx.fillStyle =
      i % 4 === 0
        ? "rgba(0,255,200,0.18)"
        : "rgba(255,255,255,0.08)";

    ctx.beginPath();

    ctx.arc(
      x,
      y,
      r,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }


  /* =======================================================
     OUTER GLASS FRAME
  ======================================================= */

  ctx.save();

  ctx.shadowColor =
    "rgba(0,220,255,0.25)";

  ctx.shadowBlur = 35;

  ctx.strokeStyle =
    "rgba(100,220,255,0.22)";

  ctx.lineWidth = 2;

  roundRect(
    ctx,
    12,
    12,
    W - 24,
    H - 24,
    30
  );

  ctx.stroke();

  ctx.restore();


  /* =======================================================
     LEFT PANEL
  ======================================================= */

  const leftW = 470;

  const leftBg =
    ctx.createLinearGradient(
      0,
      0,
      0,
      H
    );

  leftBg.addColorStop(
    0,
    "rgba(8,19,30,0.96)"
  );

  leftBg.addColorStop(
    1,
    "rgba(4,8,17,0.96)"
  );

  ctx.fillStyle =
    leftBg;

  roundRect(
    ctx,
    22,
    22,
    leftW,
    H - 44,
    25
  );

  ctx.fill();


  /* -------------------------------------------------------
     LEFT NEON LINE
  ------------------------------------------------------- */

  const lineG =
    ctx.createLinearGradient(
      0,
      80,
      0,
      H - 80
    );

  lineG.addColorStop(
    0,
    "rgba(0,255,190,0)"
  );

  lineG.addColorStop(
    0.5,
    "rgba(0,255,190,1)"
  );

  lineG.addColorStop(
    1,
    "rgba(0,255,190,0)"
  );

  ctx.fillStyle =
    lineG;

  ctx.fillRect(
    22,
    85,
    3,
    H - 170
  );


  /* =======================================================
     NEW MEMBER LABEL
  ======================================================= */

  const leftCX =
    22 + leftW / 2;

  ctx.save();

  ctx.textAlign =
    "center";

  ctx.font =
    'bold 17px "Segoe UI", Arial';

  ctx.fillStyle =
    "#00FFC8";

  ctx.shadowColor =
    "rgba(0,255,200,0.8)";

  ctx.shadowBlur = 15;

  ctx.fillText(
    "✦  NEW MEMBER  ✦",
    leftCX,
    75
  );

  ctx.restore();


  /* =======================================================
     MAIN AVATAR
  ======================================================= */

  const avatarR = 142;

  const avatarY =
    285;


  ctx.save();

  ctx.shadowColor =
    "rgba(0,255,190,0.75)";

  ctx.shadowBlur = 45;

  ctx.strokeStyle =
    "#00FFC8";

  ctx.lineWidth = 5;

  ctx.beginPath();

  ctx.arc(
    leftCX,
    avatarY,
    avatarR + 10,
    0,
    Math.PI * 2
  );

  ctx.stroke();

  ctx.restore();


  ctx.strokeStyle =
    "rgba(255,255,255,0.12)";

  ctx.lineWidth = 2;

  ctx.beginPath();

  ctx.arc(
    leftCX,
    avatarY,
    avatarR + 24,
    0,
    Math.PI * 2
  );

  ctx.stroke();


  if (newUserImg) {
    drawCircleAvatar(
      ctx,
      newUserImg,
      leftCX,
      avatarY,
      avatarR
    );
  } else {
    ctx.fillStyle =
      "#11182A";

    ctx.beginPath();

    ctx.arc(
      leftCX,
      avatarY,
      avatarR,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.save();

    ctx.textAlign =
      "center";

    ctx.textBaseline =
      "middle";

    ctx.font =
      `${Math.round(
        avatarR * 0.65
      )}px Arial`;

    ctx.fillStyle =
      "rgba(255,255,255,0.20)";

    ctx.fillText(
      "👤",
      leftCX,
      avatarY
    );

    ctx.restore();
  }


  /* =======================================================
     USER NAME
  ======================================================= */

  const nameResult =
    fitText(
      ctx,
      safeUser,
      leftW - 55,
      38,
      16
    );

  ctx.save();

  ctx.textAlign =
    "center";

  ctx.font =
    `bold ${nameResult.size}px "Segoe UI", Arial`;

  ctx.fillStyle =
    "#FFFFFF";

  ctx.shadowColor =
    "rgba(0,0,0,0.8)";

  ctx.shadowBlur = 12;

  ctx.fillText(
    nameResult.text,
    leftCX,
    avatarY + avatarR + 55
  );

  ctx.restore();


  /* =======================================================
     MEMBER BADGE
  ======================================================= */

  const badgeText =
    `✦  ${ordinal(memberCount)} MEMBER  ✦`;

  ctx.save();

  ctx.font =
    'bold 16px "Segoe UI", Arial';

  ctx.textAlign =
    "center";

  const badgeW =
    ctx.measureText(
      badgeText
    ).width + 44;

  const badgeH = 42;

  const badgeX =
    leftCX -
    badgeW / 2;

  const badgeY =
    avatarY +
    avatarR +
    78;


  const badgeG =
    ctx.createLinearGradient(
      badgeX,
      0,
      badgeX + badgeW,
      0
    );

  badgeG.addColorStop(
    0,
    "rgba(0,255,200,0.06)"
  );

  badgeG.addColorStop(
    0.5,
    "rgba(0,255,200,0.22)"
  );

  badgeG.addColorStop(
    1,
    "rgba(0,255,200,0.06)"
  );

  ctx.fillStyle =
    badgeG;

  roundRect(
    ctx,
    badgeX,
    badgeY,
    badgeW,
    badgeH,
    12
  );

  ctx.fill();


  ctx.strokeStyle =
    "rgba(0,255,200,0.55)";

  ctx.lineWidth = 1.5;

  roundRect(
    ctx,
    badgeX,
    badgeY,
    badgeW,
    badgeH,
    12
  );

  ctx.stroke();


  ctx.fillStyle =
    "#00FFC8";

  ctx.fillText(
    badgeText,
    leftCX,
    badgeY + 28
  );

  ctx.restore();


  /* =======================================================
     RIGHT PANEL
  ======================================================= */

  const rX =
    leftW + 65;

  const rRight =
    W - 65;

  /* -------------------------------------------------------
     HEADER
  ------------------------------------------------------- */

  ctx.save();

  ctx.textAlign =
    "left";

  ctx.font =
    'bold 48px "Segoe UI", Arial';

  const titleG =
    ctx.createLinearGradient(
      rX,
      0,
      rX + 500,
      0
    );

  titleG.addColorStop(
    0,
    "#FFFFFF"
  );

  titleG.addColorStop(
    0.5,
    "#B9EFFF"
  );

  titleG.addColorStop(
    1,
    "#7C8CFF"
  );

  ctx.fillStyle =
    titleG;

  ctx.shadowColor =
    "rgba(80,180,255,0.35)";

  ctx.shadowBlur = 18;

  ctx.fillText(
    "WELCOME TO OUR GROUP",
    rX,
    95
  );

  ctx.restore();


  /* -------------------------------------------------------
     HEADER LINE
  ------------------------------------------------------- */

  const headerLine =
    ctx.createLinearGradient(
      rX,
      0,
      rX + 220,
      0
    );

  headerLine.addColorStop(
    0,
    "#00FFC8"
  );

  headerLine.addColorStop(
    0.5,
    "#00BFFF"
  );

  headerLine.addColorStop(
    1,
    "rgba(0,191,255,0)"
  );

  ctx.fillStyle =
    headerLine;

  roundRect(
    ctx,
    rX,
    112,
    230,
    4,
    2
  );

  ctx.fill();


  /* =======================================================
     GROUP CARD
  ======================================================= */

  const groupY = 155;
  const groupH = 135;

  const cardG =
    ctx.createLinearGradient(
      rX,
      groupY,
      rRight,
      groupY + groupH
    );

  cardG.addColorStop(
    0,
    "rgba(20,35,55,0.78)"
  );

  cardG.addColorStop(
    1,
    "rgba(10,15,28,0.58)"
  );

  ctx.fillStyle =
    cardG;

  roundRect(
    ctx,
    rX,
    groupY,
    rRight - rX,
    groupH,
    20
  );

  ctx.fill();


  ctx.strokeStyle =
    "rgba(100,210,255,0.16)";

  ctx.lineWidth = 1;

  roundRect(
    ctx,
    rX,
    groupY,
    rRight - rX,
    groupH,
    20
  );

  ctx.stroke();


  /* GROUP IMAGE */

  const gSize = 92;

  const gX = rX + 22;
  const gY =
    groupY + 21;

  if (groupImg) {
    ctx.save();

    ctx.shadowColor =
      "rgba(0,200,255,0.5)";

    ctx.shadowBlur = 20;

    roundRect(
      ctx,
      gX,
      gY,
      gSize,
      gSize,
      18
    );

    ctx.clip();

    ctx.drawImage(
      groupImg,
      gX,
      gY,
      gSize,
      gSize
    );

    ctx.restore();
  } else {
    ctx.fillStyle =
      "#111A2C";

    roundRect(
      ctx,
      gX,
      gY,
      gSize,
      gSize,
      18
    );

    ctx.fill();

    ctx.save();

    ctx.textAlign =
      "center";

    ctx.textBaseline =
      "middle";

    ctx.font =
      "42px Arial";

    ctx.fillStyle =
      "rgba(255,255,255,0.20)";

    ctx.fillText(
      "🏠",
      gX + gSize / 2,
      gY + gSize / 2
    );

    ctx.restore();
  }


  /* GROUP NAME */

  const groupName =
    fitText(
      ctx,
      safeGroup,
      rRight - (gX + gSize + 35),
      31,
      15
    );

  ctx.save();

  ctx.textAlign =
    "left";

  ctx.font =
    `bold ${groupName.size}px "Segoe UI", Arial`;

  ctx.fillStyle =
    "#F4F7FF";

  ctx.fillText(
    groupName.text,
    gX + gSize + 25,
    groupY + 68
  );

  ctx.font =
    '13px "Segoe UI", Arial';

  ctx.fillStyle =
    "rgba(0,220,255,0.65)";

  ctx.fillText(
    "GROUP COMMUNITY",
    gX + gSize + 25,
    groupY + 94
  );

  ctx.restore();


  /* =======================================================
     INVITER SECTION
  ======================================================= */

  const invY =
    groupY + groupH + 35;

  ctx.save();

  ctx.font =
    'bold 13px "Segoe UI", Arial';

  ctx.fillStyle =
    "rgba(255,210,80,0.75)";

  ctx.fillText(
    "ADDED BY",
    rX,
    invY
  );

  ctx.restore();


  const invR = 50;

  const invCX =
    rX + invR;

  const invCY =
    invY + 72;


  if (inviterImg) {
    ctx.save();

    ctx.shadowColor =
      "rgba(255,210,70,0.5)";

    ctx.shadowBlur = 20;

    ctx.strokeStyle =
      "rgba(255,215,80,0.8)";

    ctx.lineWidth = 3;

    ctx.beginPath();

    ctx.arc(
      invCX,
      invCY,
      invR + 6,
      0,
      Math.PI * 2
    );

    ctx.stroke();

    ctx.restore();

    drawCircleAvatar(
      ctx,
      inviterImg,
      invCX,
      invCY,
      invR
    );
  } else {
    ctx.fillStyle =
      "#111A2C";

    ctx.beginPath();

    ctx.arc(
      invCX,
      invCY,
      invR,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.save();

    ctx.textAlign =
      "center";

    ctx.textBaseline =
      "middle";

    ctx.font =
      "32px Arial";

    ctx.fillStyle =
      "rgba(255,255,255,0.2)";

    ctx.fillText(
      "👤",
      invCX,
      invCY
    );

    ctx.restore();
  }


  const inviterText =
    fitText(
      ctx,
      safeInviter,
      rRight -
        (invCX + invR + 30),
      30,
      15
    );

  ctx.save();

  ctx.textAlign =
    "left";

  ctx.font =
    `bold ${inviterText.size}px "Segoe UI", Arial`;

  ctx.fillStyle =
    "#FFFFFF";

  ctx.fillText(
    inviterText.text,
    invCX + invR + 25,
    invCY + 7
  );

  ctx.font =
    '13px "Segoe UI", Arial';

  ctx.fillStyle =
    "rgba(255,215,80,0.6)";

  ctx.fillText(
    "INVITER",
    invCX + invR + 25,
    invCY + 30
  );

  ctx.restore();


  /* =======================================================
     BOTTOM MESSAGE CARD
  ======================================================= */

  const boxY =
    invY + 140;

  const boxH =
    H - boxY - 50;


  ctx.fillStyle =
    "rgba(255,255,255,0.025)";

  roundRect(
    ctx,
    rX,
    boxY,
    rRight - rX,
    boxH,
    18
  );

  ctx.fill();


  ctx.strokeStyle =
    "rgba(255,255,255,0.08)";

  ctx.lineWidth = 1;

  roundRect(
    ctx,
    rX,
    boxY,
    rRight - rX,
    boxH,
    18
  );

  ctx.stroke();


  /* Decorative icon */

  ctx.save();

  ctx.textAlign =
    "center";

  ctx.font =
    "30px Arial";

  ctx.fillStyle =
    "rgba(0,255,200,0.8)";

  ctx.shadowColor =
    "rgba(0,255,200,0.6)";

  ctx.shadowBlur = 18;

  ctx.fillText(
    "✦",
    rX + 48,
    boxY + 50
  );

  ctx.restore();


  /* Welcome message */

  ctx.save();

  ctx.textAlign =
    "left";

  ctx.font =
    'bold 23px "Segoe UI", Arial';

  const msgG =
    ctx.createLinearGradient(
      rX + 85,
      0,
      rX + 400,
      0
    );

  msgG.addColorStop(
    0,
    "#FFFFFF"
  );

  msgG.addColorStop(
    1,
    "#80EFFF"
  );

  ctx.fillStyle =
    msgG;

  ctx.fillText(
    "You're officially one of us!",
    rX + 85,
    boxY + 50
  );


  ctx.font =
    '15px "Segoe UI", Arial';

  ctx.fillStyle =
    "rgba(255,255,255,0.48)";

  ctx.fillText(
    "Enjoy the conversation, have fun & make memories ✨",
    rX + 85,
    boxY + 78
  );

  ctx.restore();


  /* =======================================================
     FOOTER
  ======================================================= */

  ctx.save();

  ctx.textAlign =
    "right";

  ctx.font =
    '13px "Segoe UI", Arial';

  ctx.fillStyle =
    "rgba(255,255,255,0.25)";

  ctx.fillText(
    "Powered by Habib•Welcome System",
    rRight,
    H - 25
  );

  ctx.restore();


  /* =======================================================
     SAVE IMAGE
  ======================================================= */

  const tempPath =
    path.join(
      __dirname,
      `temp_welcome_${Date.now()}.png`
    );

  await fs.writeFile(
    tempPath,
    canvas.toBuffer("image/png")
  );

  return tempPath;
      }
