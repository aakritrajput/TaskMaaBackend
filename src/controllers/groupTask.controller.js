import { groupTasks_from_cache, groupTasks_to_cache, invalidate_groupTask_cache, publicGroupTasks_from_cache, publicGroupTasks_to_cache } from "../cache/groupTask.cache.js";
import { GroupTask } from "../models/groupTaskModels/groupTask.model.js";
import { GroupTaskMember } from "../models/groupTaskModels/groupTaskMember.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// Note: This should be ensured on frontend that if the groupTaskMember's status is 'accepted' then only he is supposed to make requests to toggle status completion and other description also !!!

const creatGroupTask = async(req, res) => {
     try {
        const {title, dueDate} = req.body
        if (title.trim().length == 0){
            throw new ApiError(400, "Please Provide a valid title !!")
        }
        if (!dueDate) {
            throw new ApiError(400, "Please provide valid due date !!")
        }

        const userId = req.user._id
        if(!userId){
            throw new ApiError(401, "Unauthorized request !!") 
        }

        const taskData = {
            creatorId: userId,
            title,
            dueDate, // keep in mind that this should be in proper Date type !!
            winners: [], // we will here define that default array and in future we will push the winners into it 
        }

        for (const field of ['description', 'importance', 'status', 'type', 'dueDate', 'members']){   // here we are not adding check for winners as when we are creating then we would not be having winners on just task creation !!
            const value = req.body[field];  
            if (!value) continue ; // it will skip all falsy values !!
            taskData[field] = value;
        }

        const returnedTask = await GroupTask.create(taskData)
        
       
        const docs = members.map(id => ({
            groupTaskId: returnedTask._id,
            userId: id,
            role: id.toString() === userId.toString() ? 'admin' : 'participant',
            completionStatus: 'in_progress', // default
        }));

        await GroupTaskMember.insertMany(docs);

        await invalidate_groupTask_cache(userId);
        res.status(201).json(new ApiResponse(201, returnedTask, "Successfully Created the GroupTask !!"))
    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || 'There was some error adding your task !!'})
    }
}

const getMyGroupTasks = async(req, res) => {
    try {
        const userId = req.user._id
        if(!userId){
            throw new ApiError(401, 'Unauthorized request !!')
        }

        const cachedData = await groupTasks_from_cache(userId)
        if (cachedData) {
            res.status(200).json(new ApiResponse(200, cachedData, "Here are your group tasks"))
            return ;
        }

        const today = new Date();
        const tasks_from_db = await GroupTask.find({ // it returns task who's (due date + 7 days) is greator then today
            $expr: {
                $gt: [
                    {
                      $dateAdd: {
                        startDate: "$dueDate",
                        unit: "day",
                        amount: 7
                      }
                    },
                    today
                ]
            },
            members: userId // this will automatically checks if the userId is in members array or not 
        })

        if(tasks_from_db.length > 0){
            await groupTasks_to_cache(userId, tasks_from_db)
        }
        
        res.status(200).json(new ApiResponse(200, tasks_from_db, "Here are your group tasks"))
        
    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || "There was some error getting your group tasks !!"});
    }
}

const getPublicGroupTasks = async(req, res) => {
    try {
        const userId = req.user._id
        if(!userId){
            throw new ApiError(401, 'Unauthorized request !!')
        }

        const cachedData = await publicGroupTasks_from_cache();
        if (cachedData) {
            res.status(200).json(new ApiResponse(200, cachedData, "Here are public group tasks"))
            return ;
        }

        const today = new Date();
        const tasks_from_db = await GroupTask.find({ // it returns task who's (due date + 7 days) is greator then today
            $expr: {
                $gt: ["$dueDate", today]
            }
        });

        if(tasks_from_db.length > 0){
            await publicGroupTasks_to_cache(tasks_from_db)
        }
        
        res.status(200).json(new ApiResponse(200, tasks_from_db, "Here are public group tasks"))
        
    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || "There was some error getting your group tasks !!"});
    }
}

const deleteGroupTask = async(req, res) => {
    try {
        const userId = req.user._id
        if (!userId){
            throw new ApiError(401, 'Unauthorized request !!')
        }
        const {groupTaskId} = req.params
        if (!groupTaskId){
            throw new ApiError(400, 'Group task Id not provided -- which is required !!')
        }
        const groupMember = await GroupTaskMember.find({
            groupTaskId: groupTaskId,
            userId,
        })
        if(groupMember.length == 0 || groupMember.role == 'participant'){
            throw new ApiError(401, "You are not authorized to delete this task !!")
        }

        const deletedGroupTask = await GroupTask.findByIdAndDelete(groupTaskId)
        await GroupTaskMember.findOneAndDelete({groupTaskId})
        await invalidate_groupTask_cache(groupTaskId)
        res.status(200).json(new ApiResponse(200, {}, 'GroupTask Successfully deleted !!'))
    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || 'There was some error Deleting your group task !!'});
    }
}

const editGroupTask = async(req, res) => {
     try {
        const userId = req.user._id
        if(!userId){
            throw new ApiError(401, "Unauthorized request !!") 
        }

        const {groupTaskId} = req.params
        if(!groupTaskId){
            throw new ApiError(400, "Task id not provided !!")
        }

        const groupTask = await GroupTask.findById(groupTaskId)

        if (groupTask.creatorId !== userId){
            throw new ApiError(401, "You are not authorized to update this task !!")
        }

        const {title, dueDate} = req.body
        if (title.trim().length == 0){
            throw new ApiError(400, "Please Provide a valid title !!")
        }
        if (!dueDate) {
            throw new ApiError(400, "Please provide valid due date !!")
        }

        // Updating basic fields
        groupTask.creatorId = userId;
        groupTask.title = title;
        groupTask.dueDate = new Date(dueDate); // Ensure proper Date type
        
        // Dynamically updating optional fields
        for (const field of ['description', 'importance', 'status', 'type']) {
          const value = req.body[field];
          if (!value) continue; // Skip falsy values
          groupTask[field] = value;
        }
        
        // Save the updated document
        await groupTask.save();

        await invalidate_groupTask_cache(userId);

        res.status(201).json(new ApiResponse(201, returnedTask, "Successfully Updated your GroupTask !!"))
    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || 'There was some error adding your task !!'})
    }
}

const markCompleted = async(req, res) => {
    try {
        const userId = req.user._id
        const {groupTaskId} = req.params
        if (!userId) throw new ApiError(401, "Unauthorized Request !!");
        if (!groupTaskId) throw new ApiError(401, "Please provide a groupTask ID!!");

        const groupMember = await GroupTaskMember.findOne({groupTaskId, userId})
        if (!groupMember) throw new ApiError(401, "You are not authorized to do this !!");
        if(groupMember.status != 'accepted'){
            throw new ApiError(400, "You have not accepted the group invitation -- so cannot make any completions !!")
        }
        const groupTask = await GroupTask.findById(groupTaskId)

        groupTask.winners.push(userId)
        const rank = groupTask.winners.length || 1 ;


        groupMember.completionStatus = 'completed';
        groupMember.rank = rank ;
        groupMember.completedAt = new Date()

        await groupMember.save()
        res.status(200).json(new ApiResponse(200, groupMember, "Successfully marked Completed !!"))
    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || 'There was some error toggling your completion for this groupTask !!'})
    }
}

const participateInPublicGroupTask = async(req, res) => {
    try {
        const userId = req.user._id
        const { groupTaskId } = req.params
        const groupTask = await GroupTask.findById(groupTaskId)
        if(!groupTask) throw new ApiError(404, "No such task is there !!");
        if(groupTask.type == 'private') throw new ApiError(401, "Not permitted to participate in this group task -- It is private !!");

        const groupMember = await GroupTaskMember.create({
            groupTaskId,
            userId,
            status: 'accepted',
            role: 'participant',
            completionStatus: 'in_progress',
        })

        res.status(200).json(200, groupMember, "Successfully entered in the group task !!")
    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || 'There was some error in participating in this groupTask !!'})
    }
}

// const sendInviteToConnectionForGroupTask = async(req, res) => {
//     try {
//         // here in future we will be implementing the notification sending part !!
//         const {groupTaskId} = req.params
//         const {friendId} = req.body
//         const userId = req.user._id
//         if(!groupTaskId) throw new ApiError(400, "Group taskId not provided !!");
//         if(!friendId) throw new ApiError(400, "No Friend Id provided !!");

//         const groupTask = await GroupTask.findById(groupTaskId);

//         if(!groupTask) throw new ApiError(404, "No such task exist !!");
//         if(groupTask.creatorId !== userId) throw new ApiError(400, "You are not authorized to send invitation for this group Task");

//         await GroupTaskMember.create({
//             groupTaskId,
//             userId,
//             status: 'invited',
//             role: 'participant',
//             completionStatus: 'in_progress',
//         })

//         res.status(200).json(200, groupMember, "Invitation for the group task successfully sent !!")
//     } catch (error) {
//        res.status(error.statusCode || 500).json({message: error.message || 'Error sending invite to your friend for this group task !!'}) 
//     }
// }

// const actionToInviteForGroupTask = async(req, res) => {
//     try {
//         const {groupTaskId} = req.params
//         if(!groupTaskId) throw new ApiError(400, "No groupTask Id provided !!");
//         const userId = req.user._id 
//         if(!userId) throw new ApiError(401, "Unauthorized request !!");
//         const {status} = req.body
//         if(!status) throw new ApiError(400, "Please provide your action for the invitation -- 'accept' or 'declined' ")
//         const groupMember = await GroupTaskMember.findOne({groupTaskId, userId})
//         if (!groupMember) throw new ApiError(404, "No group task found with given id or either you are not part of the groupTask !!");

//         groupMember.status = status
//         await groupMember.save()

//         res.status(200).json(new ApiResponse(200, {}, `Successfully ${status} !!`))        
//     } catch (error) {
//         res.status(error.statusCode || 500).json({message: error.message || 'There was some error in participating in this groupTask !!'})
//     }
// }

export {
    creatGroupTask,
    getMyGroupTasks,
    getPublicGroupTasks,
    deleteGroupTask,
    editGroupTask,
    markCompleted,
    participateInPublicGroupTask,
 //   sendInviteToConnectionForGroupTask,
 //   actionToInviteForGroupTask
}