// PB's own notes: hand-written breakdowns that work with no key and no signal.
// Each entry: keys to match, what to grab first, and steps as [label, par seconds].
// The first step is always tiny on purpose. `quick` picks the steps for a short route.
// PB made every mess here, so every mess line blames PB.

export const LIBRARY = [
  // ---------- Chore% ----------
  {
    id: 'dishes', kind: 'chore', name: 'Dishes', mood: 'smug', keys: ['dish', 'dishes', 'sink', 'pots', 'pans', 'wash up', 'washing up'],
    mess: 'PB stacked every pan in the sink. Again.', prep: ['Dish soap', 'Sponge', 'Towel'],
    steps: [['Run the hot water', 30], ['Scrape plates into the trash', 90], ['Wash glasses and cups', 180], ['Wash plates and bowls', 240], ['Wash pots and pans', 300], ['Rack it all', 120], ['Wipe the sink', 60]],
    quick: [0, 3, 5, 6],
  },
  {
    id: 'dishwasher', kind: 'chore', name: 'Dishwasher swap', mood: 'sneaky', keys: ['dishwasher', 'unload', 'load the dishwasher', 'empty the dishwasher'],
    mess: 'PB ran the dishwasher and walked off.', prep: [],
    steps: [['Open the door', 10], ['Unload the top rack', 120], ['Unload the bottom rack', 150], ['Cutlery away', 60], ['Load the waiting dishes', 180], ['Start it', 20]],
    quick: [0, 2, 4, 5],
  },
  {
    id: 'kitchen', kind: 'chore', name: 'Kitchen reset', mood: 'giggle', keys: ['kitchen', 'counter', 'counters', 'countertop'],
    mess: 'PB had a midnight snack. All of it.', prep: ['Spray', 'Cloth', 'Trash bag'],
    steps: [['Grab a trash bag', 20], ['Clear the counters', 180], ['Dishes in the sink', 300], ['Wipe counters and stove', 180], ['Sweep the floor', 180], ['Take out the trash', 90]],
    quick: [0, 1, 3, 5],
  },
  {
    id: 'stove', kind: 'chore', name: 'Stove and oven', mood: 'shocked', keys: ['stove', 'oven', 'hob', 'stovetop', 'burner', 'burners', 'range'],
    mess: 'PB tried to make caramel. The stove remembers.', prep: ['Degreaser', 'Scrub pad', 'Cloth'],
    steps: [['Make sure it’s cool', 15], ['Lift the grates', 60], ['Soak the grates', 60], ['Spray the stovetop', 45], ['Scrub the stovetop', 240], ['Wipe the oven door', 120], ['Grates back', 60]],
    quick: [0, 3, 4, 5],
  },
  {
    id: 'microwave', kind: 'chore', name: 'Microwave', mood: 'giggle', keys: ['microwave'],
    mess: 'PB microwaved soup with no lid. It exploded.', prep: ['Bowl of water', 'Lemon or vinegar', 'Cloth'],
    steps: [['Bowl of water in', 20], ['Steam it for 3 minutes', 180], ['Wipe the inside', 120], ['Wash the plate', 90], ['Wipe the door and buttons', 45]],
    quick: [0, 1, 2, 4],
  },
  {
    id: 'fridge', kind: 'chore', name: 'Fridge clean-out', mood: 'shocked', keys: ['fridge', 'refrigerator', 'freezer', 'leftovers'],
    mess: 'PB has been growing something in the back of the fridge.', prep: ['Trash bag', 'Spray', 'Cloth'],
    steps: [['Open a trash bag', 20], ['Toss anything expired', 240], ['Pull out a shelf', 60], ['Wipe the shelves', 300], ['Wipe the drawers', 180], ['Put it all back', 180]],
    quick: [0, 1, 3, 5],
  },
  {
    id: 'meal-prep', kind: 'chore', name: 'Meal prep', mood: 'smug', keys: ['meal prep', 'meal', 'lunches', 'lunch', 'cook', 'cooking', 'batch cook'],
    mess: 'PB ate the leftovers you were counting on.', prep: ['Containers', 'Cutting board', 'Knife'],
    steps: [['Pull out the containers', 30], ['Wash and chop', 600], ['Start the grain or pasta', 120], ['Cook the main', 900], ['Portion it out', 300], ['Lids on, into the fridge', 120], ['Rinse the board and knife', 120]],
    quick: [0, 1, 3, 4],
  },
  {
    id: 'groceries', kind: 'chore', name: 'Put away groceries', mood: 'sneaky', keys: ['put away groceries', 'unpack groceries', 'groceries away', 'unpack the shopping'],
    mess: 'PB left the frozen peas on the counter.', prep: [],
    steps: [['Bags on the counter', 20], ['Cold stuff first', 120], ['Pantry stuff', 180], ['Fold the bags', 30]],
    quick: [0, 1, 2, 3],
  },
  {
    id: 'trash', kind: 'chore', name: 'Trash run', mood: 'taunt', keys: ['trash', 'garbage', 'rubbish', 'bin', 'bins', 'recycling', 'recycle', 'compost'],
    mess: 'PB knocked over the trash can.', prep: ['New bags'],
    steps: [['Grab the bag', 15], ['Tie it off', 20], ['Recycling too', 60], ['Take it all out', 120], ['New bag in', 30]],
    quick: [0, 1, 3, 4],
  },
  {
    id: 'curb', kind: 'chore', name: 'Bins to the curb', mood: 'sleepy', keys: ['curb', 'bin day', 'trash day', 'bins out', 'wheelie'],
    mess: 'PB hid the bins behind the gate on trash night.', prep: ['Shoes'],
    steps: [['Shoes on', 30], ['Trash bin out', 60], ['Recycling bin out', 60], ['Back inside', 30]],
    quick: [0, 1, 2, 3],
  },
  {
    id: 'laundry-wash', kind: 'chore', name: 'Laundry load', mood: 'sneaky', keys: ['laundry', 'wash clothes', 'washing machine', 'washer', 'dryer', 'load of laundry', 'whites', 'darks'],
    mess: 'PB ate one sock from every pair.', prep: ['Detergent', 'Basket'],
    steps: [['Grab the basket', 20], ['Sort lights and darks', 120], ['Check the pockets', 60], ['Load and start the washer', 60], ['Move it to the dryer', 120], ['Empty the dryer', 60]],
    quick: [0, 3, 4, 5],
  },
  {
    id: 'laundry-fold', kind: 'chore', name: 'Laundry fold', mood: 'sneaky', keys: ['fold', 'folding', 'put away clothes', 'clean clothes', 'laundry pile', 'chair of clothes'],
    mess: 'PB built a fort out of clean laundry.', prep: ['Hangers'],
    steps: [['Dump it on the bed', 15], ['Hang the shirts', 240], ['Fold the rest', 300], ['Pair the socks', 120], ['Put it all away', 240]],
    quick: [0, 2, 3, 4],
  },
  {
    id: 'ironing', kind: 'chore', name: 'Ironing', mood: 'smug', keys: ['iron', 'ironing', 'press', 'steam', 'wrinkles', 'steamer'],
    mess: 'PB slept in your good shirt.', prep: ['Iron', 'Board', 'Hangers'],
    steps: [['Plug in the iron', 20], ['Set up the board', 60], ['First shirt', 300], ['The rest', 600], ['Hang it all up', 120], ['Unplug and put away', 60]],
    quick: [0, 2, 3, 5],
  },
  {
    id: 'sheets', kind: 'chore', name: 'Change the sheets', mood: 'sleepy', keys: ['sheets', 'bed', 'bedding', 'make the bed', 'duvet', 'pillowcase', 'pillowcases', 'linen', 'linens'],
    mess: 'PB napped in your bed with its shoes on.', prep: ['Clean sheet set'],
    steps: [['Grab clean sheets', 30], ['Strip the bed', 90], ['Fitted sheet on', 120], ['Pillowcases on', 90], ['Duvet or blanket on', 180], ['Old sheets in the wash', 60]],
    quick: [0, 1, 2, 4],
  },
  {
    id: 'bathroom', kind: 'chore', name: 'Bathroom quick clean', mood: 'giggle', keys: ['bathroom', 'washroom', 'restroom', 'sink and mirror'],
    mess: 'PB wrote “boo” on the mirror.', prep: ['Spray', 'Cloth', 'Toilet brush'],
    steps: [['Grab the spray', 15], ['Mirror', 90], ['Sink and taps', 120], ['Toilet', 180], ['Swap the towels', 60], ['Floor', 180]],
    quick: [0, 1, 2, 3],
  },
  {
    id: 'toilet', kind: 'chore', name: 'Toilet', mood: 'shocked', keys: ['toilet', 'loo'],
    mess: 'PB used the toilet. PB does not have a body. And yet.', prep: ['Gloves', 'Toilet cleaner', 'Brush'],
    steps: [['Gloves on', 20], ['Cleaner under the rim', 30], ['Wipe the outside', 120], ['Wipe the seat', 60], ['Scrub the bowl', 90], ['Flush', 10]],
    quick: [0, 1, 4, 5],
  },
  {
    id: 'shower', kind: 'chore', name: 'Shower and tub', mood: 'dizzy', keys: ['shower', 'tub', 'bathtub', 'bath', 'tiles', 'grout', 'soap scum'],
    mess: 'PB left a ring around the tub. A big one.', prep: ['Bathroom spray', 'Scrub brush', 'Squeegee'],
    steps: [['Clear the bottles out', 60], ['Spray it all', 60], ['Let it sit', 180], ['Scrub the walls', 300], ['Scrub the tub or floor', 240], ['Rinse it down', 120], ['Bottles back', 60]],
    quick: [0, 1, 4, 5],
  },
  {
    id: 'vacuum', kind: 'chore', name: 'Vacuum run', mood: 'dizzy', keys: ['vacuum', 'hoover', 'carpet', 'carpets', 'rug', 'rugs'],
    mess: 'PB tracked glitter through every room.', prep: ['Vacuum'],
    steps: [['Plug it in', 20], ['Pick stuff up off the floor', 180], ['Main room', 300], ['Bedrooms', 300], ['Hallway and stairs', 240], ['Empty the canister', 60]],
    quick: [0, 1, 2, 5],
  },
  {
    id: 'mop', kind: 'chore', name: 'Mop the floors', mood: 'giggle', keys: ['mop', 'mopping', 'floor', 'floors', 'sweep', 'sweeping', 'swiffer'],
    mess: 'PB did a moonwalk in spilled juice.', prep: ['Broom', 'Mop', 'Bucket'],
    steps: [['Fill the bucket', 60], ['Chairs up', 60], ['Sweep', 240], ['Mop the kitchen', 240], ['Mop the bathroom', 180], ['Dump the water', 45]],
    quick: [0, 2, 3, 5],
  },
  {
    id: 'dust', kind: 'chore', name: 'Dust everything', mood: 'sneaky', keys: ['dust', 'dusting', 'shelves', 'shelf', 'baseboards', 'blinds', 'ceiling fan'],
    mess: 'PB shed. Ghosts shed. Who knew.', prep: ['Duster or cloth'],
    steps: [['Grab a cloth', 15], ['High shelves first', 240], ['Tables and surfaces', 240], ['TV and screens', 90], ['Baseboards', 300]],
    quick: [0, 1, 2, 3],
  },
  {
    id: 'windows', kind: 'chore', name: 'Windows and mirrors', mood: 'smug', keys: ['window', 'windows', 'glass', 'mirror', 'mirrors', 'streaks'],
    mess: 'PB pressed its face on every window.', prep: ['Glass spray', 'Microfiber cloth'],
    steps: [['Grab the spray', 15], ['Mirrors', 180], ['Inside windows', 480], ['Sills and tracks', 240], ['Glass doors', 120]],
    quick: [0, 1, 2, 4],
  },
  {
    id: 'tidy', kind: 'chore', name: 'Ten-minute tidy', mood: 'dizzy', keys: ['tidy', 'tidy up', 'clean up', 'clutter', 'mess', 'living room', 'lounge', 'pick up'],
    mess: 'PB redecorated the floor.', prep: ['Basket'],
    steps: [['Grab a basket', 15], ['Living room', 180], ['Kitchen table', 120], ['Bedroom', 180], ['Put it all back', 180]],
    quick: [0, 1, 3, 4],
  },
  {
    id: 'bedroom', kind: 'chore', name: 'Bedroom reset', mood: 'sleepy', keys: ['bedroom', 'my room', 'room'],
    mess: 'PB tried on everything you own.', prep: ['Basket', 'Trash bag'],
    steps: [['Open the curtains', 15], ['Make the bed', 120], ['Clothes off the floor', 180], ['Clear the nightstand', 90], ['Trash out', 60], ['Quick vacuum', 240]],
    quick: [0, 1, 2, 4],
  },
  {
    id: 'kids', kind: 'chore', name: 'Toy sweep', mood: 'giggle', keys: ['toy', 'toys', 'lego', 'kids room', 'playroom', 'nursery'],
    mess: 'PB played with every toy at once.', prep: ['Bins'],
    steps: [['Grab the bins', 20], ['Soft toys', 120], ['Blocks and bricks', 180], ['Books back', 90], ['Everything else', 180]],
    quick: [0, 1, 2, 4],
  },
  {
    id: 'closet', kind: 'chore', name: 'Closet purge', mood: 'sneaky', keys: ['closet', 'wardrobe', 'declutter', 'decluttering', 'donate', 'drawer', 'drawers', 'purge'],
    mess: 'PB stuffed the closet until the door won’t shut.', prep: ['Two bags', 'Hangers'],
    steps: [['Open two bags', 30], ['Pull out one shelf', 60], ['Keep, donate, toss', 600], ['Hang the keepers', 300], ['Bag by the door', 60]],
    quick: [0, 1, 2, 4],
  },
  {
    id: 'desk', kind: 'chore', name: 'Desk reset', mood: 'taunt', keys: ['desk', 'workspace', 'office', 'workstation', 'cables', 'desktop'],
    mess: 'PB filed your papers in the floor.', prep: ['Trash bag', 'Cloth'],
    steps: [['Mugs to the kitchen', 45], ['Papers in one pile', 120], ['Trash out', 60], ['Wipe the desk', 90], ['Cables tucked', 120]],
    quick: [0, 1, 2, 3],
  },
  {
    id: 'mail', kind: 'chore', name: 'Mail pile', mood: 'sneaky', keys: ['mail', 'paperwork', 'paper pile', 'letters', 'envelopes', 'mail pile'],
    mess: 'PB hid a bill under a pizza menu.', prep: ['Recycling bin'],
    steps: [['Grab the pile', 20], ['Junk straight to recycling', 120], ['Bills in one stack', 120], ['Shred anything personal', 180], ['Stack where you’ll see it', 30]],
    quick: [0, 1, 2, 4],
  },
  {
    id: 'entry', kind: 'chore', name: 'Entryway', mood: 'taunt', keys: ['entry', 'entryway', 'hallway', 'shoes', 'coats', 'mudroom', 'front door'],
    mess: 'PB kicked every shoe across the hall.', prep: [],
    steps: [['Shoes in pairs', 90], ['Coats on hooks', 60], ['Bags off the floor', 60], ['Sweep the mat', 90]],
    quick: [0, 1, 2, 3],
  },
  {
    id: 'garage', kind: 'chore', name: 'Garage sweep', mood: 'dizzy', keys: ['garage', 'shed', 'basement', 'attic', 'storage'],
    mess: 'PB has been building something out here.', prep: ['Trash bags', 'Broom', 'Gloves'],
    steps: [['Gloves on', 20], ['Trash in a bag', 300], ['Tools back on the wall', 300], ['Boxes stacked', 300], ['Sweep', 300]],
    quick: [0, 1, 2, 4],
  },
  {
    id: 'plants', kind: 'chore', name: 'Plant round', mood: 'sleepy', keys: ['plant', 'plants', 'water the plants', 'houseplant', 'houseplants', 'watering'],
    mess: 'PB has been drinking the plant water.', prep: ['Watering can'],
    steps: [['Fill the can', 30], ['Windowsill plants', 90], ['Big plants', 120], ['Pick off dead leaves', 90], ['Wipe up drips', 30]],
    quick: [0, 1, 2, 4],
  },
  {
    id: 'litter', kind: 'chore', name: 'Litter box', mood: 'shocked', keys: ['litter', 'litter box', 'cat box', 'kitty litter', 'cat'],
    mess: 'PB taught the cat to kick litter at the wall.', prep: ['Scoop', 'Bag'],
    steps: [['Grab the scoop', 15], ['Scoop it', 90], ['Bag it and tie it', 30], ['Top up the litter', 45], ['Sweep the spill', 60]],
    quick: [0, 1, 2, 4],
  },
  {
    id: 'pet', kind: 'chore', name: 'Pet station', mood: 'giggle', keys: ['dog', 'pet', 'pets', 'bowl', 'bowls', 'dog bed', 'fish tank', 'cage', 'poop', 'yard poop'],
    mess: 'PB let the dog into the treats.', prep: ['Bags', 'Cloth'],
    steps: [['Grab the bags', 15], ['Wash the bowls', 120], ['Fresh water and food', 60], ['Shake out the bed', 60], ['Yard sweep', 240]],
    quick: [0, 1, 2, 3],
  },
  {
    id: 'car-inside', kind: 'chore', name: 'Car interior', mood: 'smug', keys: ['car', 'car interior', 'vacuum the car', 'clean the car', 'clean my car'],
    mess: 'PB ate fries in the back seat. Years ago.', prep: ['Trash bag', 'Vacuum', 'Wipes'],
    steps: [['Grab a trash bag', 20], ['Trash out', 180], ['Floor mats out and shaken', 180], ['Vacuum the seats and floor', 480], ['Wipe the dash', 180], ['Mats back', 60]],
    quick: [0, 1, 3, 4],
  },
  {
    id: 'lawn', kind: 'chore', name: 'Mow the lawn', mood: 'taunt', keys: ['lawn', 'mow', 'mowing', 'grass', 'yard', 'garden', 'backyard', 'front yard'],
    mess: 'PB let the grass get ankle deep.', prep: ['Mower', 'Gloves', 'Water'],
    steps: [['Shoes on', 30], ['Pick up sticks and toys', 180], ['Front lawn', 900], ['Back lawn', 1200], ['Edges', 600], ['Mower away', 120]],
    quick: [0, 1, 2, 5],
  },
  {
    id: 'weeds', kind: 'chore', name: 'Weed patrol', mood: 'sneaky', keys: ['weed', 'weeds', 'weeding', 'flower bed', 'flower beds', 'garden bed'],
    mess: 'PB planted weeds. On purpose.', prep: ['Gloves', 'Bucket', 'Trowel'],
    steps: [['Gloves on', 20], ['First bed', 600], ['Second bed', 600], ['Path edges', 300], ['Bucket to the bin', 90]],
    quick: [0, 1, 2, 4],
  },
  {
    id: 'leaves', kind: 'chore', name: 'Leaf run', mood: 'dizzy', keys: ['leaf', 'leaves', 'rake', 'raking', 'gutters'],
    mess: 'PB jumped in the leaf pile. Every pile.', prep: ['Rake', 'Yard bags', 'Gloves'],
    steps: [['Gloves on', 20], ['Rake the front', 900], ['Rake the back', 900], ['Bag it', 600], ['Bags to the curb', 120]],
    quick: [0, 1, 3, 4],
  },
  {
    id: 'snow', kind: 'chore', name: 'Shovel snow', mood: 'shocked', keys: ['snow', 'shovel', 'shoveling', 'driveway', 'ice', 'salt'],
    mess: 'PB made a snow angel on the driveway. Then the path.', prep: ['Shovel', 'Salt', 'Gloves'],
    steps: [['Boots on', 60], ['Front steps', 300], ['The path', 600], ['The driveway', 1200], ['Salt the slippery bits', 180]],
    quick: [0, 1, 2, 4],
  },
  {
    id: 'deep', kind: 'chore', name: 'Whole-house blitz', mood: 'dizzy', keys: ['house', 'whole house', 'apartment', 'flat', 'deep clean', 'spring clean', 'guests', 'company coming'],
    mess: 'PB threw a party. You weren’t invited. You’re cleaning up.', prep: ['Spray', 'Cloths', 'Trash bags', 'Vacuum'],
    steps: [['Open the windows', 30], ['Trash from every room', 300], ['Kitchen counters', 300], ['Bathroom', 600], ['Dust the surfaces', 480], ['Vacuum everywhere', 900], ['Mop the hard floors', 600]],
    quick: [0, 1, 2, 5],
  },

  // ---------- Errand% ----------
  {
    id: 'grocery', kind: 'errand', name: 'Grocery dash', mood: 'giggle', keys: ['grocery', 'groceries', 'supermarket', 'food shop', 'shopping', 'costco', 'market'],
    mess: 'PB ate the last of everything and left the list on the fridge.', prep: ['The list', 'Bags', 'Keys'],
    steps: [['Out the door', 60], ['Drive to the store', 600, true], ['Grab the list', 1200], ['Check out', 300], ['Drive home', 600, true]],
    quick: [0, 1, 2, 4],
  },
  {
    id: 'pharmacy', kind: 'errand', name: 'Pharmacy pickup', mood: 'smug', keys: ['pharmacy', 'prescription', 'refill', 'chemist', 'meds', 'medicine'],
    mess: 'PB let the refill sit at the counter all week.', prep: ['ID', 'Keys'],
    steps: [['Out the door', 60], ['Get there', 600, true], ['Pick it up', 300], ['Back home', 600, true]],
    quick: [0, 1, 2, 3],
  },
  {
    id: 'post', kind: 'errand', name: 'Post office run', mood: 'sneaky', keys: ['post office', 'mail a', 'ship', 'shipping', 'package', 'parcel', 'stamps', 'ups', 'fedex', 'usps'],
    mess: 'PB sealed the return in a box. Three weeks ago.', prep: ['The package', 'Label'],
    steps: [['Box by the door', 30], ['Drive there', 600, true], ['Drop it off', 300], ['Drive home', 600, true]],
    quick: [0, 1, 2, 3],
  },
  {
    id: 'return', kind: 'errand', name: 'Return run', mood: 'taunt', keys: ['return', 'returns', 'refund', 'exchange', 'store return'],
    mess: 'PB kept the wrong size for a month.', prep: ['The item', 'Receipt'],
    steps: [['Bag by the door', 30], ['Drive to the store', 600, true], ['Return desk', 420], ['Drive home', 600, true]],
    quick: [0, 1, 2, 3],
  },
  {
    id: 'gas', kind: 'errand', name: 'Fuel stop', mood: 'sleepy', keys: ['gas', 'petrol', 'fuel', 'fill up', 'charge the car', 'car wash', 'tire', 'tyres', 'tires'],
    mess: 'PB drove on fumes and parked it like that.', prep: ['Keys', 'Card'],
    steps: [['Keys and shoes', 45], ['Drive to the station', 420, true], ['Fill it up', 300], ['Drive home', 420, true]],
    quick: [0, 1, 2, 3],
  },
  {
    id: 'library', kind: 'errand', name: 'Library run', mood: 'smug', keys: ['library', 'books', 'overdue'],
    mess: 'PB has been using the library book as a coaster.', prep: ['The books', 'Library card'],
    steps: [['Books in a bag', 30], ['Get there', 600, true], ['Drop them off', 180], ['Back home', 600, true]],
    quick: [0, 1, 2, 3],
  },
  {
    id: 'donate', kind: 'errand', name: 'Donation drop', mood: 'giggle', keys: ['donation', 'donate', 'goodwill', 'charity shop', 'thrift', 'drop off', 'dump', 'recycling center'],
    mess: 'PB has been sitting on the donation bag in the hall.', prep: ['The bags', 'Keys'],
    steps: [['Bags in the car', 120], ['Drive there', 900, true], ['Drop it off', 300], ['Drive home', 900, true]],
    quick: [0, 1, 2, 3],
  },
  {
    id: 'bank', kind: 'errand', name: 'Bank run', mood: 'sneaky', keys: ['bank', 'deposit', 'atm', 'cash', 'cheque', 'check'],
    mess: 'PB used the check as a bookmark.', prep: ['The check', 'Card'],
    steps: [['Wallet and keys', 30], ['Get there', 600, true], ['Make the deposit', 300], ['Back home', 600, true]],
    quick: [0, 1, 2, 3],
  },
  {
    id: 'walk', kind: 'errand', name: 'Corner shop walk', mood: 'taunt', keys: ['walk', 'corner shop', 'bodega', 'milk', 'bread', 'coffee'],
    mess: 'PB drank the last of the milk. Straight from the carton.', prep: ['Wallet'],
    steps: [['Shoes on', 30], ['Walk there', 480], ['Grab it', 180], ['Walk back', 480]],
    quick: [0, 1, 2, 3],
  },

  // ---------- Admin% ---------- (no links, no fields for ID numbers or logins; always end on the confirmation)
  {
    id: 'cancel', kind: 'admin', name: 'Cancel a subscription', mood: 'smug', keys: ['cancel', 'subscription', 'unsubscribe', 'membership', 'gym', 'streaming', 'free trial', 'trial'],
    mess: 'PB signed you up for a free trial. It was not free.', prep: ['The bank statement'],
    steps: [['Find the charge', 120], ['Open the account settings', 120], ['Find the cancel button', 180], ['Click past the guilt trip', 60], ['Get the confirmation', 60]],
    quick: [0, 2, 3, 4],
  },
  {
    id: 'bill', kind: 'admin', name: 'Pay the bill', mood: 'sneaky', keys: ['bill', 'pay', 'invoice', 'utility', 'electric', 'water bill', 'phone bill', 'rent'],
    mess: 'PB hid the bill under a pizza menu.', prep: ['The bill', 'Card'],
    steps: [['Open the bill', 30], ['Go to the official site', 60], ['Sign in', 90], ['Pay it', 120], ['Get the confirmation', 30]],
    quick: [0, 2, 3, 4],
  },
  {
    id: 'autopay', kind: 'admin', name: 'Set up autopay', mood: 'sleepy', keys: ['autopay', 'auto pay', 'direct debit', 'automatic payment', 'recurring'],
    mess: 'PB keeps forgetting the due date. On purpose.', prep: ['Bank details nearby'],
    steps: [['Open the official site', 60], ['Find payment settings', 120], ['Turn on autopay', 120], ['Pick the date', 60], ['Get the confirmation', 30]],
    quick: [0, 1, 2, 4],
  },
  {
    id: 'appointment', kind: 'admin', name: 'Book the appointment', mood: 'giggle', keys: ['appointment', 'book', 'booking', 'dentist', 'doctor', 'haircut', 'vet', 'checkup', 'schedule'],
    mess: 'PB has been “meaning to call” since spring.', prep: ['Your calendar'],
    steps: [['Find the booking page', 90], ['Pick a time', 120], ['Fill in the details', 180], ['Book it', 30], ['Get the confirmation', 30]],
    quick: [0, 1, 3, 4],
  },
  {
    id: 'renewal', kind: 'admin', name: 'Renew the thing', mood: 'taunt', keys: ['renew', 'renewal', 'license', 'licence', 'registration', 'passport', 'permit', 'expired', 'expiring'],
    mess: 'PB let the renewal letter age like milk.', prep: ['The renewal letter', 'Card'],
    steps: [['Find the official page', 120], ['Read what you need', 120], ['Fill it in', 420], ['Pay', 120], ['Get the confirmation', 30]],
    quick: [0, 2, 3, 4],
  },
  {
    id: 'address', kind: 'admin', name: 'Update my address', mood: 'dizzy', keys: ['address', 'moved', 'moving', 'change of address', 'forwarding', 'mail forwarding'],
    mess: 'PB keeps getting your mail at the old place.', prep: ['New address written down'],
    steps: [['Find the official page', 120], ['Open your profile', 90], ['Change the address', 120], ['Save it', 30], ['Get the confirmation', 30]],
    quick: [0, 2, 3, 4],
  },
  {
    id: 'dispute', kind: 'admin', name: 'Dispute a charge', mood: 'shocked', keys: ['dispute', 'chargeback', 'wrong charge', 'overcharged', 'double charged', 'fraud'],
    mess: 'PB bought something weird with your card. Allegedly.', prep: ['The statement'],
    steps: [['Find the charge', 120], ['Open your bank’s app or site', 60], ['Find dispute a charge', 120], ['Explain what happened', 300], ['Get the confirmation', 30]],
    quick: [0, 1, 3, 4],
  },
  {
    id: 'claim', kind: 'admin', name: 'Insurance claim', mood: 'sneaky', keys: ['claim', 'insurance', 'reimbursement', 'reimburse', 'expense', 'expenses', 'hsa', 'fsa'],
    mess: 'PB filed the receipts in the junk drawer.', prep: ['Receipts', 'Policy number'],
    steps: [['Gather the receipts', 180], ['Open the official claim page', 90], ['Fill in the claim', 420], ['Upload the receipts', 180], ['Get the confirmation', 30]],
    quick: [0, 2, 3, 4],
  },
  {
    id: 'unclaimed', kind: 'admin', name: 'Hunt unclaimed money', mood: 'giggle', keys: ['unclaimed', 'unclaimed money', 'lost money', 'unclaimed property', 'missing money'],
    mess: 'PB has been sitting on money with your name on it.', prep: ['Old addresses'],
    steps: [['Find your official unclaimed property site', 120], ['Search your name', 120], ['Check old addresses', 180], ['Start a claim', 300], ['Get the confirmation', 30]],
    quick: [0, 1, 3, 4],
  },
  {
    id: 'taxes', kind: 'admin', name: 'Tax paperwork', mood: 'shocked', keys: ['tax', 'taxes', 'tax return', 'w2', 'w-2', '1099', 'irs', 'hmrc'],
    mess: 'PB used your tax forms as a blanket.', prep: ['Last year’s return'],
    steps: [['Make a folder', 60], ['Download your tax forms', 300], ['Check the numbers', 300], ['File or send it on', 600], ['Get the confirmation', 30]],
    quick: [0, 1, 3, 4],
  },
]

// When nothing matches, PB still has a shape for the run.
export const GENERIC = {
  chore: { name: '', mood: 'sneaky', mess: 'PB has been in here. You can tell.', prep: [],
    steps: [['Grab what you need', 45], ['Clear the space', 240], ['Do the main job', 600], ['Put it all back', 180]], quick: [0, 1, 2, 3] },
  errand: { name: '', mood: 'taunt', mess: 'PB followed you out the door.', prep: ['Keys'],
    steps: [['Out the door', 60], ['Get there', 600, true], ['Do the thing', 600], ['Back home', 600, true]], quick: [0, 1, 2, 3] },
  admin: { name: '', mood: 'smug', mess: 'PB hid the envelope.', prep: [],
    steps: [['Find the official page', 120], ['Do the main bit', 420], ['Check it over', 120], ['Get the confirmation', 30]], quick: [0, 1, 2, 3] },
}
