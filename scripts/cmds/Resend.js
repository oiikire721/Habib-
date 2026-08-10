module.exports = {
  config: {
    name: "iginfo",
    aliases: ["instagram", "insta", "ig"],
    version: "2.2",
    author: "SK HABIBULLA",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Get Instagram account info"
    },
    longDescription: {
      en: "Fetch Instagram profile information using HikerAPI"
    },
    category: "info",
    guide: {
      en: "{pn} <username>\nExample: {pn} sk_habib_687"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    const axios = require("axios");

    // HikerAPI Key
    const API_KEY = "uqayq00jrxcdjtct897xmvte54k47mhn";

    let username = args.join(" ").replace(/@/g, "").trim().toLowerCase();

    if (!username) {
      return message.reply("⚠️ Instagram username দিন।\nউদাহরণ: .iginfo sk_habib_687");
    }

    const loading = await message.reply(`🔍 Searching @${username}...`);

    try {
      const { data: user } = await axios.get(
        `https://api.hikerapi.com/v1/user/by/username`,
        {
          params: { username },
          headers: {
            "x-access-key": API_KEY
          },
          timeout: 15000
        }
      );

      if (!user || !user.username) {
        throw new Error("User not found");
      }

      let msg = `✅ Instagram Info\n`;
      msg += `━━━━━━━━━━━━━━━━━━\n`;
      msg += `👤 Name        : ${user.full_name || "N/A"}\n`;
      msg += `🔗 Username    : @${user.username}\n`;
      msg += `🔗 Profile     : https://www.instagram.com/${user.username}/\n`;
      msg += `📝 Bio         : ${user.biography || "No bio"}\n`;
      msg += `📸 Posts       : ${(user.media_count || 0).toLocaleString()}\n`;
      msg += `❤️ Followers   : ${(user.follower_count || 0).toLocaleString()}\n`;
      msg += `👥 Following   : ${(user.following_count || 0).toLocaleString()}\n`;
      msg += `✅ Verified    : ${user.is_verified ? "Yes" : "No"}\n`;
      msg += `🔒 Private     : ${user.is_private ? "Yes" : "No"}\n`;

      if (user.external_url) {
        msg += `🌐 Website     : ${user.external_url}\n`;
      }

      msg += `━━━━━━━━━━━━━━━━━━`;

      try { await api.unsendMessage(loading.messageID); } catch (e) {}

      // ===== Full HD Profile Picture পাওয়ার চেষ্টা =====
      let pic = user.profile_pic_url_hd || user.profile_pic_url || user.hd_profile_pic_url_info?.url;

      if (pic) {
        // সাইজ প্যারামিটার সরিয়ে সবচেয়ে বড় কোয়ালিটি নেওয়া
        pic = pic
          .replace(/\/s\d+x\d+\//, "/")           // s150x150, s320x320 ইত্যাদি সরানো
          .replace(/\/c\d+\.\d+\.\d+\.\d+\//, "/") // crop প্যারামিটার সরানো
          .replace(/\?.*$/, "")                   // query string সরানো (কখনো কখনো লাগে)
          + "?stp=dst-jpg_e35";                   // ভালো কোয়ালিটি ফোর্স করা
      }

      if (pic) {
        try {
          return message.reply({
            body: msg,
            attachment: await global.utils.getStreamFromURL(pic)
          });
        } catch (e) {
          // যদি হাই কোয়ালিটি ফেইল করে, আসল URL দিয়ে চেষ্টা
          try {
            const originalPic = user.profile_pic_url_hd || user.profile_pic_url;
            return message.reply({
              body: msg,
              attachment: await global.utils.getStreamFromURL(originalPic)
            });
          } catch (e2) {
            return message.reply(msg);
          }
        }
      }

      return message.reply(msg);

    } catch (error) {
      try { await api.unsendMessage(loading.messageID); } catch (e) {}

      console.error(error?.response?.data || error.message);

      if (error.response?.status === 404) {
        return message.reply(`❌ Username "${username}" পাওয়া যায়নি!`);
      }

      if (error.response?.status === 401 || error.response?.status === 403 || error.response?.status === 402) {
        return message.reply("❌ API Key ভুল আছে অথবা ফ্রি কোটা শেষ হয়ে গেছে।");
      }

      return message.reply(`❌ Error: ${error.message}`);
    }
  }
};
