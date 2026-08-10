module.exports = {
  config: {
    name: "iginfo",
    aliases: ["instagram", "insta", "ig"],
    version: "2.0",
    author: "Sk Habibulla",
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

      const pic = user.profile_pic_url_hd || user.profile_pic_url;

      if (pic) {
        try {
          return message.reply({
            body: msg,
            attachment: await global.utils.getStreamFromURL(pic)
          });
        } catch (e) {
          return message.reply(msg);
        }
      }

      return message.reply(msg);

    } catch (error) {
      try { await api.unsendMessage(loading.messageID); } catch (e) {}

      console.error(error?.response?.data || error.message);

      if (error.response?.status === 404) {
        return message.reply(`❌ Username "${username}" পাওয়া যায়নি!`);
      }

      if (error.response?.status === 401 || error.response?.status === 403) {
        return message.reply("❌ API Key ভুল আছে অথবা ফ্রি কোটা শেষ হয়ে গেছে।");
      }

      return message.reply(`❌ Error: ${error.message}`);
    }
  }
};
