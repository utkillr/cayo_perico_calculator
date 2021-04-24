function myParseInt(id) {
    value = parseInt($("#" + id).val());
    return value ? value : 0;
}

function get_item_to_count(all_input_count, is_elite, can_unlock) {
    var item_to_count = {}

    for (item in all_input_count) {
        count = is_elite ?
            can_unlock ?
                all_input_count[item]["in"]["lock"] + all_input_count[item]["in"]["free"] :
                all_input_count[item]["in"]["free"] :
            can_unlock ?
                all_input_count[item]["out"]["lock"] + all_input_count[item]["out"]["free"] + all_input_count[item]["in"]["lock"] + all_input_count[item]["in"]["free"] :
                all_input_count[item]["out"]["free"] + all_input_count[item]["in"]["free"];
        if (count > 0) {
            item_to_count[item] = count;
        }
    }

    return item_to_count;
}

function normalize(price, slots) {
    return {
        "price": price / slots,
        "slots": slots
    };
}

function summarize(all_input_count, item_config, players, is_elite) {
    var slots = players * 24;
    var item_to_count = get_item_to_count(all_input_count, is_elite, players > 1);
    var total = {};

    while (slots > 0) {
      
      var expensive_item = "unknown";
      var max_price = 0;

      // Find the most expensive item available
      for (var item in item_to_count) {
        if (item_config[item]["price"] > max_price && item_to_count[item] > 0) {
          max_price = item_config[item]["price"];
          expensive_item = item;
        }
      }

      // Taken everything but still not full
      if (max_price == 0) {
        return {
            "result": total,
            "elite":  false
        };
      }

      // Have something to fully take
      while ((slots > item_config[expensive_item]["slots"]) && (item_to_count[expensive_item] > 0)) {
        item_to_count[expensive_item] -= 1;
        total[expensive_item] = expensive_item in total ?
                                total[expensive_item] + item_config[expensive_item]["slots"] :
                                item_config[expensive_item]["slots"];
        slots -= item_config[expensive_item]["slots"];
      }

      // Space left for part of single loot
      if (item_to_count[expensive_item] > 0) {
        // In case it's not Picture - just take needed part
        if (expensive_item != "picture") {
          item_to_count[expensive_item] -= slots / item_config[expensive_item]["slots"];
          total[expensive_item] = expensive_item in total ?
                                  total[expensive_item] + slots :
                                  slots;
          slots = 0;
        // But if it's a picture, it's tricky
        } else {
          // Let's find out how much we gain if we take whole picture instead of part of most expensive item we have
          // Ignore any attempt to remove more than 1 full item - it's definitely worse than skipping a picture
          var most_expensive_price_we_had = 1000000;
          var most_expensive_we_had;
          for (var item in item_config) {
            if ((item_config[item]["price"] > item_config[expensive_item]["price"]) &&
                (item_config[item]["price"] < most_expensive_price_we_had) &&
                (item in total) && (total[item] > 0)) {
              most_expensive_price_we_had = item_config[item]["price"];
              most_expensive_we_had = item;
            }
          }
          // We have very few slots left - let's find out how much else we need
          var slots_to_remove = item_config[expensive_item]["slots"] - slots;
          var price_if_picture_taken = item_config[expensive_item]["price"] * item_config[expensive_item]["slots"] - slots_to_remove * most_expensive_price_we_had;

          // Then let's find out how much we gain if we don't take picture and fill up with money
          var next_expensive_left = "money";
          var next_expensive_price_left = item_config[next_expensive_left]["price"];
          // Take as much as possible or take all
          var slots_to_add = next_expensive_left in item_to_count ?
                             slots > item_to_count[next_expensive_left] * item_config[next_expensive_left]["slots"] ?
                                 item_to_count[next_expensive_left] * item_config[next_expensive_left]["slots"] :
                                 slots :
                             0;
          var price_if_picture_not_taken = slots_to_add * next_expensive_price_left;

          if (price_if_picture_taken > price_if_picture_not_taken) {
            // Remove last most expensive part
            total[most_expensive_we_had] -= slots_to_remove;
            item_to_count[most_expensive_we_had] += slots_to_remove / item_config[most_expensive_we_had]["slots"];
            // Add picture
            total[expensive_item] = expensive_item in total ?
                                    total[expensive_item] + item_config[expensive_item]["slots"] :
                                    item_config[expensive_item]["slots"];
            item_to_count[expensive_item] -= 1;
            // We are definitely full here
            return {
                "result": total,
                "elite":  is_elite
            };
          } else {
            // Add money
            total[next_expensive_left] = next_expensive_left in total ?
                                         total[next_expensive_left] + slots_to_add:
                                         slots_to_add;
            item_to_count[next_expensive_left] -= slots_to_add;
            return {
                "result": total,
                "elite":  slots <= item_to_count[next_expensive_left] * item_config[next_expensive_left]["slots"] ?
                          is_elite :
                          false
            };
          }
        }
      }
    }

    return {
        "result": total,
        "elite":  is_elite
    };

}

$(document).ready(function() {
  $("#count").click(function() {
    
    var is_hard       = $("#hard").prop('checked');
    var safe_price    = 75000;
    var safe_epsilon  = 25000;
    var elite_price   = is_hard ? 100000 : 50000;
    var pavel_share   = 0.02;
    var buyer_share   = 0.1;
    var players_share = 1 - (pavel_share + buyer_share);

    var main_price = parseInt($("#main").val());
    if (is_hard) {
        main_price = parseInt(main_price * 1.1);
    };

    var items = ["money", "weed", "coke", "picture", "gold"];
    var places = ["in", "out"];
    var all_input_count = {}
    for (var i = 0; i < items.length; i++) {
        all_input_count[items[i]] = {}
        for (var j = 0; j < places.length; j++) {
            all_input_count[items[i]][places[j]] = {
                "free": myParseInt(items[i] + "_" + places[j] + "_cnt") - myParseInt(items[i] + "_" + places[j] + "_lock_cnt"),
                "lock": myParseInt(items[i] + "_" + places[j] + "_lock_cnt")
            }
        }
    };

    var shares = []
    var players = 0;
    for (var i = 1; i <= 4; i++) {
      shares.push(parseInt($("#percent_" + i).val()));
      if (shares[shares.length - 1] != 0) {
        players++;
      }
    }

    var item_config = {
        "money":   normalize((is_hard ? 91080  : 87795)  * parseInt($("#money_mult").val()),   6),
        "weed":    normalize((is_hard ? 145260 : 145485) * parseInt($("#weed_mult").val()),    9),
        "coke":    normalize((is_hard ? 223065 : 222795) * parseInt($("#money_mult").val()),   12),
        "picture": normalize((is_hard ? 192200 : 181400) * parseInt($("#picture_mult").val()), 12),
        "gold":    normalize((is_hard ? 328800 : 332592) * parseInt($("#gold_mult").val()),    16),
    }

    var stats = {
        "elite": {
            "summary": summarize(all_input_count, item_config, players, true),
            "raw":     main_price + safe_price
        },
        "simple": {
            "summary": summarize(all_input_count, item_config, players, false),
            "raw":     main_price + safe_price
        }
    };

    for (type in stats) {
        for (item in stats[type]["summary"]["result"]) {
            stats[type]["raw"] += item_config[item]["price"] * stats[type]["summary"]["result"][item];
        }
        stats[type]["total"] = {
            "pavel":   stats[type]["raw"] * pavel_share,
            "buyer":   stats[type]["raw"] * buyer_share,
            "players": stats[type]["raw"] * players_share
        };
        if (stats[type]["summary"]["elite"]) {
            stats[type]["total"]["players"] += elite_price * players;
        }
    }

    var go = stats["elite"]["total"]["players"] > stats["simple"]["total"]["players"] ? "elite" : "simple";

    $("#total").val(stats[go]["raw"] + " +- " + safe_epsilon);
    $("#safe").val(safe_price + " +- " + safe_epsilon);
    $("#main_price").val(main_price);

    for (item in item_config) {
        if (item in stats[go]["summary"]["result"]) {
            $("#" + item + "_take_cnt").val(parseInt((stats[go]["summary"]["result"][item] / item_config[item]["slots"]) * 1000 + 0.5) / 1000);
            $("#" + item + "_take_slot").val(stats[go]["summary"]["result"][item] + "/" + players * 24);
            $("#" + item + "_take_total").val(parseInt(stats[go]["summary"]["result"][item] * item_config[item]["price"]));
        } else {
            $("#" + item + "_take_cnt").val(0);
            $("#" + item + "_take_slot").val("0/" + players * 24);
            $("#" + item + "_take_total").val(0);
        }
    }

    $("#total_buyer").val(parseInt(stats[go]["total"]["buyer"]) + " +- " + parseInt(safe_epsilon * buyer_share));
    $("#total_pavel").val(parseInt(stats[go]["total"]["pavel"]) + " +- " + parseInt(safe_epsilon * pavel_share));

    for (var i = 0; i <= 3; i++) {
      $("#total_" + (i + 1)).val(shares[i] != 0 ?
        parseInt(stats[go]["total"]["players"] * shares[i] / 100) + " +- " + parseInt(safe_epsilon * players_share * shares[i] / 100) :
        0);
    }

    $("#elite").prop('checked', stats[go]["summary"]["elite"]);

  }); 
});