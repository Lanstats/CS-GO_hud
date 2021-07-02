const db = require("./database.js").huds;
const fs = require("fs");
const address = require("ip").address();

db.loadDatabase();
module.exports = {
  loadConfig: () => {
    if (!fs.existsSync("./config.json")) return false;
    let config = {};
    try {
      config = JSON.parse(fs.readFileSync("./config.json", "utf8"));
      config.Address = address;
      return config;
    } catch (e) {
      console.warn("\n\tConfig file is corrupted or doesn't exist, proceeding with default values");
      config.Address = address;
      config.ServerPort = 1248;
      config.GameStateIntegrationPort = 1337;
      config.SteamApiKey = "";
      config.PrintPlayerData = false;
      config.DisplayAvatars = false;
      config.DisplayPlayerAvatars = false;
      config.DisplayTeamFlags = false;
      config.DisplayPlayerFlags = false;
      config.LeftImage = "";
      config.LeftPrimary = "";
      config.GameType = "";
      config.LeftSecondary = "";
      config.RightImage = "";
      config.RightPrimary = "";
      config.RightSecondary = "";
      config.AvatarDirectory = "/public/files/avatars/";
      config.SpecialEvent = "";
      config.GSIToken = "120987";
      return config;
    }
  },
  addHUD: (req, res) => {
    if (!fs.existsSync("./public/huds")) return res.sendStatus(500);

    let existingHUDs = fs.readdirSync("./public/huds").filter(function(file) {
      return fs.statSync("./public/huds/" + file).isDirectory();
    });

    let instance = req.body; //name of instance, name of hud, seconds of delay;

    instance.delay = !instance.delay || instance.delay < 0 ? 0 : instance.delay;

    if (!existingHUDs.includes(instance.hud)) return res.sendStatus(500);

    db.insert(instance, (err, newHUD) => {
      if (err) return res.sendStatus(500);

      return res.status(200).json({
        id: newHUD["_id"]
      });
    });
  },
  getHUDs: (req, res) => {
    if (!fs.existsSync("./public/huds")) return res.sendStatus(500);

    let existingHUDs = fs.readdirSync("./public/huds").filter(function(file) {
      return fs.statSync("./public/huds/" + file).isDirectory();
    });

    function getInstances(err, inst) {
      if (err) return res.sendStatus(500);

      let files = {};

      for (var i = 0; i < existingHUDs.length; i++) {
        let dirs = fs.readdirSync("./public/huds/" + existingHUDs[i] + "/");
        files[existingHUDs[i]] = dirs;
      }
      return res.status(200).json({
        huds: existingHUDs,
        instances: inst,
        files: files
      });
    }

    function getExistingHUDs(err, numRemoved) {
      if (err) return res.sendStatus(500);

      db.find({}, getInstances);
    }
    db.remove(
      {
        hud: {
          $nin: existingHUDs
        }
      },
      {
        multi: true
      },
      getExistingHUDs
    );
  },
  setHUD: (req, res) => {
    let data = req.body;

    if (!data.id || data.enabled == null || !data.name || data.delay == null) return res.sendStatus(500);
    db.update(
      {
        _id: data.id
      },
      {
        $set: {
          enabled: data.enabled,
          name: data.name,
          delay: data.delay || 0
        }
      },
      {},
      (err, numReplaced) => {
        if (err) return res.sendStatus(500);
        return res.sendStatus(200);
      }
    );
  },
  deleteHUD: (req, res) => {
    let id = req.body.id;

    db.remove(
      {
        _id: id
      },
      {},
      (err, numRemoved) => {
        if (err || numRemoved != 1) return res.sendStatus(500);
        return res.sendStatus(200);
      }
    );
  },
  render: (req, res) => {
    let config = module.exports.loadConfig();
    let id = req.params.id;

    function displayHUD(err, huds) {
      if (huds.length != 1) return res.sendStatus(500);

      let hud = huds[0];

      if (!fs.existsSync("./public/huds/default") || !fs.existsSync("./public/huds/" + hud.hud + "/template.pug")) return res.sendStatus(500);
      if (!hud.enabled) return res.redirect("/#huds");

      let hud_dir = "/huds/" + hud.hud + "/index.js";
      let css_dir = "/huds/" + hud.hud + "/style.css";
      let anim_dir = "/huds/" + hud.hud + "/animate.css";

      return res.render("../public/huds/" + hud.hud + "/template.pug", {
        ip: config.Address,
        port: config.ServerPort,
        print_player_data: config.PrintPlayerData,
        display_avatars: config.DisplayAvatars,
        display_player_avatars: config.DisplayPlayerAvatars,
        display_team_flags: config.DisplayTeamFlags,
        display_player_flags: config.DisplayPlayerFlags,
        special_event: config.SpecialEvent,
        left_image: config.LeftImage,
        left_primary: config.LeftPrimary,
        left_secondary: config.LeftSecondary,
        right_image: config.RightImage,
        right_primary: config.RightPrimary,
        right_secondary: config.RightSecondary,
        game_type: config.GameType,
        map_one: config.Map1,
        map_two: config.Map2,
        map_three: config.Map3,
        map_four: config.Map4,
        map_five: config.Map5,
        map_one_pick: config.Map1_pick,
        map_two_pick: config.Map2_pick,
        map_three_pick: config.Map3_pick,
        map_four_pick: config.Map4_pick,
        map_five_pick: config.Map5_pick,
        allow_deaths_info: config.Deaths_info,
        allow_alive: config.allow_alive,
        no_logo: config.no_logo,
        money_power: config.MoneyPower,
        hud: hud_dir,
        css: css_dir,
        anim: anim_dir,
        delay: hud.delay > 0 ? hud.delay : 0
      });
    }

    db.find(
      {
        _id: id
      },
      displayHUD
    );
  },

  overlay: (req, res) => {
    return res.render("list.pug");
  }
};
