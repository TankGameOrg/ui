# Tank Game Rules v4

Created by: Bryan Friestad and WDC Longmont

Players: 2 – 100

Time: 3+ days

# Play

Each player controls one Tank with 3 lives. At the start of
each gameday each living Tank is given 1 action point. An
action point can be spent to Move or Shoot.
Once you lose your last life, you are dead, and you join a
group called the Council. The Council can affect the living
players in significant ways.

# SETUP

Each player should be given one tank card and assigned a
spawn randomly. Provide a blank Logbook next to the physical
board. All Tanks start with 3 lives, 1 action point, 0 gold,
and a range of 2. Write this information, as well as your
name, on the tank card.
If any Tank was the Last Man Standing in the previous game,
they start with a Bounty of 5 gold. Any tanks who were Last
Men Standing in games before that start with a bounty of 3
gold.

# ENDING THE GAME

The game ends when there is only 1 Living Tank remaining on
the board. That Tank is the Last Man Standing and the
singular winner of the game.
The game can end early if the Council succeeds at passing an
Armistice Vote, which is explained later on in the rules. In
this case, the members of the Council win instead.

# ACTIONS

Below is a table of actions that you can take. In general,
you may take an action at any time during the gameday. Each
action has a cost and an effect, as well as some additional
rules specified further in the rules.

Action Name   | Cost     | Effect
--------------|----------|------------
Move          | 1 AP     | Move to an adjacent space
Shoot         | 1 AP     | Shoot at a space within your range
Give X Gold   | X+1 gold | Give X gold to another tank within your range
Buy AP        | 3 gold   | Gain 1 AP
Upgrade Range | 5 gold   | Increase range by 1

After taking each action, note the action you took into the
Logbook. Once you have performed one of these actions, you
must wait for a cooldown, meaning you may not take another
action for 5 minutes.

If you do not wish to Move or Shoot on a given day, you can
save your action point for another day. However, you cannot
have more than 5 action points at any time.
You may take an action at any time during the gameday, and
you can do any combination of actions (in any order), as
long as you have enough resources saved up and you obey the
cooldown.

## Move

Spend 1 action point to move to any adjacent space. You cannot
move into an occupied space. You can move diagonally, but
only if you could otherwise make the move in 2 steps (see
images).

![](move-v3-diagram.png)

## Shoot

Spend 1 action point to shoot.  You can target any grid
space within your range that you have line of sight on.

* If the grid space is empty, you automatically miss.
* If the grid space is occupied by a wall or dead tank, you automatically hit, and it loses 1 durability.
* If the grid space is occupied by a living tank, you must roll to see if you hit or miss.
    * Determine the distance to the target.
    * Note your tank’s range.
    * Roll a # of dice equal to `(Range – Distance) + 1`.
        * Shortcuts:
        * When at your range, roll 1 die.
        * When adjacent, roll [range] dice.
    * If any of the dice show this symbol ![](hit.png), your attack hits, and the tank loses 1 life.

# GOLD

Gold is a secondary resource that is used for a few things.
You collect it by being positioned in the Gold Mine at the
start of a day, or by looting it from other tanks when you
kill them. There is no limit to the amount of gold you can
hold.

## Giving Gold

Gold can be given to other tanks within your range. You do
not need to have line of sight to share gold. The Tax on
transferring gold is 1 gold per instance. For example, if
you want to give 5 gold to another Tank, it will cost you 6
gold. There are no limits to the number of times you can
transfer gold per gameday, given that you have the gold. The
1 gold Tax is put into the Coffer (see The Council below).

## Buying Action Points

You may spend 3 gold to buy 1 action point. You still may
not have more than 5 action points at any time.

## Upgrading Range

You may spend 5 gold to increase your range by 1. This
affects the number of hit dice you roll and how far away you
can target with abilities like Shoot and Give Gold.

## Looting Gold

When you kill or destroy another Tank, you gain some of the
gold that they had, but this is also taxed. The looter gains
at least 1 gold, and the council gains at least 1 gold
(given the looter got theirs first). After those
requirements are satisfied, the council collects a tax of
25% of the amount, rounded. Example, Corey kills Bryan, who
had 10 gold. Corey gains 7 gold and the coffer gains 3 gold.

## Gold Mine

There is an area(s) on the game board marked as the Gold
Mine. At the start of each gameday, each Gold Mine generates
an amount of gold equal to the number of grid spaces it
overlaps with on the board. The gold is divided up among all
living Tanks that are within that area. If the Gold does not
divide evenly, the remainder is put into the Coffer. If
there are no tanks in the mine, all of the gold it generates
is put into the Coffer.

When a wall which is <ins>orthogonally adjacent</ins> to an existing
Gold Mine is broken, the Gold Mine expands into that space,
and the amount of gold it generates increases accordingly.
If at any time, two or more independent Gold Mines are
orthogonally adjacent, then all involved mines are merged.

# DEATH AND DESTRUCTION

## Death

When a Tank is killed, it stays where it is on the board. It
loses its action points and gold, and it gains 3 Durability.
Dead tanks do not gain action points at the start of the
day, nor can they perform actions. Dead tanks do not gain
gold from gold mines. Dead tanks retain their range. Note
this kill in the Logbook (see above).

If you kill a tank, you gain all of the gold that tank had.
Note this kill in the Logbook (see above).

## Destruction

When a tank is destroyed, it is removed from the board. When
you destroy a tank, you gain nothing.

## Resurrection

If a dead tank gains a life for any reason, it becomes a
living tank. It regains its ability to gain action points
and perform actions. It regains its ability to gain gold
from mines. You have no action points until you gain one for
some reason, such as the Council or the start of a gameday.

# THE COUNCIL

“The Council” is a group of out-of-play players that can
still affect the outcome of the game. If your tank is dead,
you are considered a Councilor, and your vote counts as 1
vote. If your Tank is destroyed, then you are a Senator, and
your vote counts as 2 votes.

## Coffer

The Council has a Coffer of gold which accumulates
throughout the game (see Gold and Gold Mine above). The
Coffer exists even if nobody is on the council.
The Council has a base income. At the start of each gameday,
the Coffer gains 1 gold per Councilor, and 3 gold per
Senator, that is a member of the Council.

## Decrees

At any time during a gameday, the Council may vote on one of
the following Decrees. If the vote passes, the gold is
spent. If the Coffer doesn’t have the required gold, you
can’t do it.

Decree     | Vote Type            | Cost     | Target                  | Effect
-----------|----------------------|----------|-------------------------|--------------------------------------
Stimulus   | Uncontested Majority | 3 gold   | Living Tank             | Target gains 1 action point
Bounty     | Uncontested Majority | 1–5 gold | Living Tank             | There is a bounty on the target Tank
Grant Life | Super-majority       | 15 gold  | Any Tank Living or Dead | Target gains a life


## More Information/Limitations

* Stimulus - There is no limit to the number of decrees per gameday.
* Bounty - The council must agree on both the target of and the amount of the bounty. The bounty does not go away until that tank is dead. The player who kills the tank gets all of the bounty gold. If the target tank already has a bounty, then their bounty increases by the amount of the new bounty (it accumulates). Only one bounty may be decreed each gameday.
* Grant Life – The Council may only choose this decree once it has at least 3 members. No tank may have more than 3 lives. May only be decreed once per gameday.

Votes from councilors may be sent in virtually, but the final result must be recorded in the Logbook.

## Armistice Vote

The members of the Council have a means by which they can
win the game. By swaying the public opinion in favor of an
armistice, they can end the game early and prevent someone
from being declared the Last Man Standing and earning all
the glory for themselves.
There is an Armistice Counter that tracks the public’s
opinion. At the start of each gameday, the counter gains 1
point for each member of the council (councilors and
senators count equally). When the counter reaches a
specified limit (determined by player count and map), the
game ends and the Council wins.

# LOGBOOK

The Logbook is the source of truth for the game. All actions
must be written into the Logbook, or else it is not
considered to have happened. Actions are applied in the
order they are written in the Logbook. All actions must be
written by the person performing that action. Any
illegal/invalid action written into the logbook will be
struck out and undone. You will not get any spent actions
points or gold back. Also note when tanks are killed.

## Examples:

### Move

* “10/9/2023 – Schmude – Moved to B3”

### Shoot

* “10/10/2023 – Corey – Shot at G4 (hit)”
* “10/11/2023 – Xavion – Shot at D7 (miss)”

### Giving Gold

* “10/19/2023 – Bryan – Gave 5 Gold to Schmude”

### Upgrade

* “10/19/2023 – Ryan – Upgrade Range”

### Buy Action Point

* “10/20/2023 – Stomp – Bought 2 action points”

### Council Decrees

* “10/20/2023 – Council Decree – Stimulus to Stomp”
* “10/21/2023 – Council Decree – 3 Gold Bounty on Xavion”
* “10/22/2023 - Council Decree – Grant Life to Ty”

### Kills/Deaths

* “10/23/2023 – Craig was killed”

# DEFINITIONS

## Adjacent

The 8 grid spaces surrounding grid space X are considered Adjacent.

## Dead / Killed

A Tank is Dead if it has 0 lives. The Tank which hit it, bringing it
from 1 life to 0 lives is the Tank that killed it.

## Destroyed

A Tank or Wall is Destroyed if it has 0 durability. The Tank which hit
it, bringing it from 1 durability to 0 durability is the Tank that
destroyed it. When something is destroyed, it is removed from the game
board permanently.

## Distance

The distance from one tank/wall to another tank/wall is defined by the
distance between their grid spaces. The distance from one grid space
to another is the minimum number of adjacent steps it takes to go from
one to another.

Expressed algebraically: `max(abs(a.x-b.x), abs(a.y-b.y))`

## Durability

The number of hits something can take until it’s Destroyed.

## Gameday

A Gameday is defined as follows: Any Monday, Wednesday or Thursday
that the office is open, from 10am to 4pm.

## Hit

A hit is the result of a successful shoot action.

## Line Of sight

Given an attacker A and a target B, line of sight is defined as
follows. A has line of sight on B, if you can draw a straight,
uninterrupted line from the center of A’s space to the center of B’s
space. Walls and Tanks that are not your target count as interruptions
to lines. Crossing the corner of something is not considered an
interruption unless you cross two opposing corners.

## Living

A Tank is Living if it has at least 1 life.

## Miss

A miss is the result of an unsuccessful shoot action.

## Occupied

A space is occupied if there is a wall or tank (living or dead) in it.

## Orthogonally Adjacent

The 4 grid spaces to the top, bottom, left and right of grid space X
are considered Orthogonally Adjacent to X.

## Out-Of-Play

A player whose tank is dead or destroyed.

## Range

Given Tank A and a range of R, A can attack/give with any other Tank
that is within R spaces from A’s position.

## Super-Majority

A super-majority is a vote where at least 2/3rds of the votes are in
favor.

## Uncontested Majority

An uncontested majority is a vote where one and only one option has at
least 50% of the votes. Ties (ex. 2 votes for Tank A and 2 votes for
Tank B) fail to pass.

# Patch notes

* New line of sight rules
* Previous “Last Men Standing” start with a bounty
* Giving gold, upgrading range and buying action points are now considered “actions”
* All actions have a 5-minute cooldown
* The Council gains some tax when you are looting gold from a dead player
* Buying action points does not become cheaper with more gold. The “Buy AP” action only buys 1 action at a time
* Upgrading Range costs 5 gold
* Grant Life decree requires a super-majority
* The council gains a base income to the Coffer
* The council can win via Armistice Vote
* Gameday is from 10am to 4pm
