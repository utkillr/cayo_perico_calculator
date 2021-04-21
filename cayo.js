$(document).ready(function() {
  $("#count").click(function() {
    
    var is_hard = $("#hard").prop('checked');
    var is_elite = $("#elite").prop('checked');

    var main_price = parseInt($("#main").val());
    if (is_hard) {
      main_price = parseInt(main_price * 1.1);
    }

    var safe_price = 75000;
    var safe_epsilon = 25000;

    var money_in_lock_cnt  = parseInt($("#money_in_lock_cnt").val());
    var money_in_cnt  = parseInt($("#money_in_cnt").val()) - money_in_lock_cnt;
    var money_lock_cnt  = parseInt($("#money_lock_cnt").val());
    var money_cnt = parseInt($("#money_cnt").val()) - money_in_cnt - money_lock_cnt;

    var weed_lock_cnt = parseInt($("#weed_lock_cnt").val());
    var weed_cnt = parseInt($("#weed_cnt").val()) - weed_lock_cnt;

    var coke_lock_cnt = parseInt($("#coke_lock_cnt").val());
    var coke_cnt = parseInt($("#coke_cnt").val()) - coke_lock_cnt;

    var picture_lock_cnt = parseInt($("#picture_lock_cnt").val());
    var picture_cnt = parseInt($("#picture_cnt").val()) - picture_lock_cnt;

    var gold_lock_cnt = parseInt($("#gold_lock_cnt").val());
    var gold_cnt = parseInt($("#gold_cnt").val()) - gold_lock_cnt;

    var slots = 24;
    var shares = []
    var players = 0;
    for (var i = 1; i <= 4; i++) {
      shares.push(parseInt($("#percent_" + i).val()));
      if (shares[shares.length - 1] != 0) {
        players++;
      }
    }
    var total_slots = slots * players;

    var item_to_price = {
      "money": (is_hard ? 91080 : 87795) * parseInt($("#money_mult").val()),
      "weed": (is_hard ? 145260 : 145485) * parseInt($("#weed_mult").val()),
      "coke": (is_hard ? 223065 : 222795) * parseInt($("#money_mult").val()),
      "picture": (is_hard ? 192200 : 181400) * parseInt($("#picture_mult").val()),
      "gold": (is_hard ? 328800 : 332592) * parseInt($("#gold_mult").val())
    };

    var item_to_count = {
      "money": money_cnt,
      "money_in": money_in_cnt,
      "money_lock": money_lock_cnt,
      "money_in_lock": money_in_lock_cnt,
      "weed": weed_cnt,
      "weed_lock": weed_lock_cnt,
      "coke": coke_cnt,
      "coke_lock": coke_lock_cnt,
      "picture": picture_cnt,
      "picture_lock": picture_lock_cnt,
      "gold": gold_cnt,
      "gold_lock": gold_lock_cnt
    };

    var item_to_slots = {
      "money": 6,
      "weed": 9,
      "coke": 12,
      "picture": 12,
      "gold": 16
    };

    var total_item_to_slots = {
      "money": 0,
      "weed": 0,
      "coke": 0,
      "picture": 0,
      "gold": 0
    };

    var allowed_items;

    if (is_elite) {
      if (players == 1) {
        allowed_items = ["money", "picture", "gold"];
        item_to_count["money"] = item_to_count["money_in"];
      } else {
        allowed_items = ["money", "picture", "gold"];
        item_to_count["money"] = item_to_count["money_in"] + item_to_count["money_in_lock"];
        item_to_count["picture"] += item_to_count["picture_lock"];
        item_to_count["gold"] += item_to_count["gold_lock"];
      }
    } else {
      if (players == 1) {
        allowed_items = ["money", "weed", "coke", "picture", "gold"];
        item_to_count["money"] += item_to_count["money_in"];
      } else {
        allowed_items = ["money", "weed", "coke", "picture", "gold"];
        item_to_count["money"] += item_to_count["money_lock"] + item_to_count["money_in"] + item_to_count["money_in_lock"];
        item_to_count["weed"] += item_to_count["weed_lock"];
        item_to_count["coke"] += item_to_count["coke_lock"];
        item_to_count["picture"] += item_to_count["picture_lock"];
        item_to_count["gold"] += item_to_count["gold_lock"];
      }
    }

    var allowed_items_avg_price = {};

    for (var i = 0; i < allowed_items.length; i++) {
      allowed_items_avg_price[allowed_items[i]] = item_to_price[allowed_items[i]] / item_to_slots[allowed_items[i]];
    }

    var total = 0;

    while (total_slots > 0) {
      
      var expensive_item;
      var max_avg_price = 0;
      
      for (var i = 0; i < allowed_items.length; i++) {
        if ((allowed_items_avg_price[allowed_items[i]] > max_avg_price) && (item_to_count[allowed_items[i]] > 0)) {
          max_avg_price = allowed_items_avg_price[allowed_items[i]];
          expensive_item = allowed_items[i];
        }
      }

      // Taken everything but still not full
      if (max_avg_price == 0) break;

      // Have something to fully take
      while ((total_slots > item_to_slots[expensive_item]) && (item_to_count[expensive_item] > 0)) {
        item_to_count[expensive_item] -= 1;
        total_slots -= item_to_slots[expensive_item];
        total_item_to_slots[expensive_item] += 1;
        total += item_to_price[expensive_item];

        console.log("Single " + expensive_item + " took " + item_to_slots[expensive_item] + " slots - " + total_slots + " left");
      }

      // Space left for part of single loot
      if (item_to_count[expensive_item] > 0) {
        // In case it's not Picture - just take needed part
        if (expensive_item != "picture") {
          item_to_count[expensive_item] -= total_slots / item_to_slots[expensive_item];
          total_item_to_slots[expensive_item] += total_slots / item_to_slots[expensive_item];
          total += item_to_price[expensive_item] * (total_slots / item_to_slots[expensive_item]);

          console.log("Part of " + expensive_item + " took " + total_slots / item_to_slots[expensive_item] + " slots - " + 0 + " left");

          total_slots = 0;
        // But if it's a picture, it's tricky
        } else {
          var most_expensive_price_we_had = 1000000;
          var most_expensive_we_had;
          var next_expensive_price_left = allowed_items.includes("money") ? allowed_items_avg_price["money"] : 0;
          var next_expensive_left = "money";

          // Let's find out how much we lose if we take whole picture instead of part of most expensive item we have
          for (var i = 0; i < allowed_items.length; i++) {
            if ((allowed_items_avg_price[allowed_items[i]] > allowed_items_avg_price[expensive_item]) &&
                (allowed_items_avg_price[allowed_items[i]] < most_expensive_price_we_had) &&
                (total_item_to_slots[allowed_items[i]] > 0)) {
              most_expensive_price_we_had = allowed_items_avg_price[allowed_items[i]];
              most_expensive_we_had = allowed_items[i];
            }
          }

          var most_expensive_slots_to_remove = item_to_slots[expensive_item] - total_slots;
          var price_if_picture_taken = allowed_items_avg_price[expensive_item] * item_to_slots[expensive_item] - most_expensive_slots_to_remove * most_expensive_price_we_had;

          console.log("If we take Picture instead of " + most_expensive_slots_to_remove + " slots of " + most_expensive_we_had + ", then we'll lose " + most_expensive_slots_to_remove * most_expensive_price_we_had + ", but gain " + allowed_items_avg_price[expensive_item] * item_to_slots[expensive_item] + ", which makes " + price_if_picture_taken + " total");

          var next_expensive_slots_to_take = total_slots > item_to_count[next_expensive_left] * item_to_slots[next_expensive_left] ?
                                             item_to_count[next_expensive_left] * item_to_slots[next_expensive_left] :
                                             total_slots;
          var price_if_picture_not_taken = next_expensive_slots_to_take * next_expensive_price_left;

          console.log("If we take " + next_expensive_slots_to_take + " slots of " + next_expensive_left + " instead of picture, then we'll simply gain ", next_expensive_slots_to_take * next_expensive_price_left + ", which makes " + price_if_picture_not_taken + " total");

          if (price_if_picture_taken > price_if_picture_not_taken) {
            // Remove last most expensive part
            total_item_to_slots[most_expensive_we_had] -= most_expensive_slots_to_remove / item_to_slots[most_expensive_we_had];
            // Add picture
            total_item_to_slots[expensive_item] += 1
            total += price_if_picture_taken;
          } else {
            // Add money
            total_item_to_slots[next_expensive_left] += next_expensive_slots_to_take / item_to_slots[next_expensive_left];
            total += price_if_picture_not_taken;
          }

          total_slots = 0;
        }
      }
    }

    total = total + main_price + safe_price;

    $("#total").val(total + "+-" + safe_epsilon);

    $("#money_take_cnt").val(total_item_to_slots["money"]);
    $("#money_take_total").val(total_item_to_slots["money"] * item_to_price["money"]);

    $("#weed_take_cnt").val(total_item_to_slots["weed"]);
    $("#weed_take_total").val(total_item_to_slots["weed"] * item_to_price["weed"]);

    $("#coke_take_cnt").val(total_item_to_slots["coke"]);
    $("#coke_take_total").val(total_item_to_slots["coke"] * item_to_price["coke"]);

    $("#picture_take_cnt").val(total_item_to_slots["picture"]);
    $("#picture_take_total").val(total_item_to_slots["picture"] * item_to_price["picture"]);

    $("#gold_take_cnt").val(total_item_to_slots["gold"]);
    $("#gold_take_total").val(total_item_to_slots["gold"] * item_to_price["gold"]);

    safe_epsilon = safe_epsilon / players;

    total_buyer = parseInt(total * 10 / 100);
    total_pavel = parseInt(total * 2 / 100);
    total = total - total_buyer - total_pavel;

    for (var i = 0; i <= 3; i++) {
      console.log(total + " " + shares[i]);
      var total_i = parseInt(total * shares[i] / 100);
      if (total_i != 0 && is_elite) {
        total_i += is_hard ? 100000 : 50000;
      }

      $("#total_" + (i + 1)).val(total_i != 0 ? total_i + "+-" + safe_epsilon : 0);
    }

    $("#total_buyer").val(total_buyer);
    $("#total_pavel").val(total_pavel);

  }); 
});