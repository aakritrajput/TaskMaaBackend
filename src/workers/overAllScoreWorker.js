import { User } from "../models/user.model.js";

let collectedOverallScores = new Map();

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

export function updateOverAllScore(userId, action) {
    
    if (!actionScores[action]) return;  

    const scoreData = actionScores[action];
    const currentScore = collectedOverallScores.get(userId) || 0;   

    if ("plus" in scoreData) {
      console.log('plus runs - complete')
      collectedOverallScores.set(userId, currentScore + scoreData.plus);
    } else if ("minus" in scoreData) {
      console.log('minus runs in worker')
      collectedOverallScores.set(userId, currentScore - scoreData.minus);
    }
}

// Flushing updates every 5 seconds
setInterval(async () => {

    if (collectedOverallScores.size === 0) return;

    try {
      const updates = [];   

      for (const [userId, scoreChange] of collectedOverallScores.entries()) {
        updates.push({
          updateOne: {
            filter: { _id: userId },
            update: { $inc: { overallScore: scoreChange } },
          },
        });
      }

      await User.bulkWrite(updates);    

      // Clearing map after successful update
      collectedOverallScores.clear();
    } catch (error) {
      console.error("Error updating overall scores:", error);
    }
}, 5000);
