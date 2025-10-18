import { User } from "../models/user.model.js";

// this file also contains the logic to update weekly updates in batches !!

let collectedOverallScores = new Map();
let collectedWeeklyUpdates = {};

const actionScores = {
    markedComplete: { plus: 5 },
    deletedCompleted: { minus: 5 },
    markedUncomplete: { minus: 5 },
    gotBatch: { plus: 25 },
    streak5: { plus: 10 },
    streak10: { plus: 20 },
    streak15: { plus: 30 },
    streak20: { plus: 40 },
    streak25: { plus: 50 },
    streak30: { plus: 60 },
    streak60: { plus: 100 },
    streak6M: { plus: 500 },
    streak1Y: { plus: 1000 },
};

export function updateWeeklyScore(userId, data){
  // action: 'complete' or 'uncomplete'
  if(!data) return ;
  collectedWeeklyUpdates[userId] = data ; // it should be that list of updated Weekly score !!
}

export function updateOverAllScore(userId, action) {
    
    if (!actionScores[action]) return;  

    const scoreData = actionScores[action];
    const currentScore = collectedOverallScores.get(userId) || 0;   

    if ("plus" in scoreData) {
      collectedOverallScores.set(userId, currentScore + scoreData.plus);
    } else if ("minus" in scoreData) {
      collectedOverallScores.set(userId, currentScore - scoreData.minus);
    }
}

// Flushing updates every 5 seconds
setInterval(async () => {

    if (collectedOverallScores.size === 0) return;

    try {
      const updates = [];   

      for (const [userId, scoreChange] of collectedOverallScores.entries()) {
        
        collectedWeeklyUpdates[userId] ? 
        updates.push({
          updateOne: {
            filter: {_id: userId},
            update: {$inc: {overallScore: scoreChange}, $set: { weeklyProgress: collectedWeeklyUpdates[userId] } }
          }
        })
        :
        updates.push({
          updateOne: {
            filter: { _id: userId },
            update: { $inc: { overallScore: scoreChange } },
          },
        })
      }

      await User.bulkWrite(updates);    

      // Clearing map after successful update
      collectedOverallScores.clear();
    } catch (error) {
      console.error("Error updating overall scores:", error);
    }
}, 5000);
