import { groupTaskMembersFromCache, groupTaskMembersToCache, groupTasks_from_cache, groupTasks_to_cache, invalidate_groupTask_cache, invalidate_groupTask_cache_of_multiple_users, invalidate_publicGroupTask_cache, invalidateGroupTaskMembers, publicGroupTasks_from_cache, publicGroupTasks_to_cache } from "../cache/groupTask.cache.js";
import { GroupTask } from "../models/groupTaskModels/groupTask.model.js";
import { GroupTaskMember } from "../models/groupTaskModels/groupTaskMember.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { updateOverAllScore } from "../workers/overAllScoreWorker.js";

// Note: This should be ensured on frontend that if the groupTaskMember's status is 'accepted' then only he is supposed to make requests to toggle status completion and other description also !!!

const createGroupTask = async(req, res) => {
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
       
        const docs = returnedTask.members.map(id => ({
            groupTaskId: returnedTask._id,
            userId: id,
            role: id.toString() === userId.toString() ? 'admin' : 'participant',
            completionStatus: 'inProgress', // default
        }));

        await GroupTaskMember.insertMany(docs);

        await invalidate_groupTask_cache_of_multiple_users(returnedTask.members)
        if(returnedTask.type == 'public'){
            invalidate_publicGroupTask_cache()
        }
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
        }).sort({ createdAt: -1 });

        if(tasks_from_db.length > 0){
            await groupTasks_to_cache(userId, tasks_from_db)
        }
        
        res.status(200).json(new ApiResponse(200, tasks_from_db, "Here are your group tasks"))
        
    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || "There was some error getting your group tasks !!"});
    }
}

const getMembersOfGroupTask = async(req, res) => {
    try {
        const {id} = req.params

        if (!id) {
            throw new ApiError(400, "Please provide a valid task Id")
        }
        
        const membersFromCache = await groupTaskMembersFromCache(id)

        if(membersFromCache) {
            res.status(200).json(new ApiResponse(200, membersFromCache, 'Here are group task members !!'))
            return ;
        }

        const membersFromDb = await GroupTask.findById(id, {
            members: 1,
            _id: 0,
        }).populate('members', '_id name username profilePicture').lean()

        if(!membersFromDb){ // this is if no such task with given id 
            throw new ApiError(400, 'No such group Task with given id !!')
        }

        const finalData = membersFromDb?.members || [];

        if (finalData.length > 0){  // we are still pushing it to cache as some other member can use this fetched data 
            await groupTaskMembersToCache(id, finalData)
        }

        const isUserAllowed = finalData.some(member => member._id == req.user._id) // this will be only true if the user requesting the data is actually a member

        if(!isUserAllowed){
            throw new ApiError(403, "You are not the member in the group task - hence the access not allowed !!")
        }

        res.status(200).json(new ApiResponse(200, finalData, 'Here are group task members !!'))
    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || "There was some error getting members of group task!!"});
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
            const myCachedPublicTasks = cachedData.filter(task => !task.members.includes(userId))
            res.status(200).json(new ApiResponse(200, myCachedPublicTasks, "Here are public group tasks"))
            return ;
        }

        const today = new Date();
        const tasks_from_db = await GroupTask.find({
          $expr: {
            $gt: ["$dueDate", today] // tasks whose dueDate > today
          },
          type: "public",
          status: "ongoing",
        }).sort({ createdAt: -1 });  // latest first

        if(tasks_from_db.length > 0){
            await publicGroupTasks_to_cache(tasks_from_db)
        }

        const myPublicTasks = tasks_from_db.filter(task => !task.members.includes(userId)) // this will only send the taskk in which user till now has not participated and are public
        
        res.status(200).json(new ApiResponse(200, myPublicTasks, "Here are public group tasks"))
        
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
        if(groupMember.length == 0 || groupMember[0].role == 'participant'){
            throw new ApiError(401, "You are not authorized to delete this task !!")
        }

        const deletedTask = await GroupTask.findByIdAndDelete(groupTaskId)
        await GroupTaskMember.deleteMany({groupTaskId})

        if(deletedTask.type == 'public'){
            await invalidate_publicGroupTask_cache();
        }
        await invalidate_groupTask_cache_of_multiple_users(deletedTask.members)
        res.status(200).json(new ApiResponse(200, 'OK', 'GroupTask Successfully deleted !!'))
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

        if (groupTask.status == 'completed') {
            throw new ApiError(403, "Group task is already completed, Editing after completion is not allowed !!")
        }

        if (groupTask.creatorId.toString() !== userId){
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
        for (const field of ['description', 'importance', 'status', 'type', 'dueDate', 'members']){   // here we are not adding check for winners as when we are creating then we would not be having winners on just task creation !!
            const value = req.body[field];  
            if (!value) continue ; // it will skip all falsy values !!
            groupTask[field] = value;
        }

        // Save the updated document
        await groupTask.save();

        await invalidate_groupTask_cache(userId);
        await invalidateGroupTaskMembers(groupTaskId);

        res.status(201).json(new ApiResponse(201, "Ok", "Successfully Updated your GroupTask !!"))
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
        const groupTask = await GroupTask.findById(groupTaskId)

        groupTask.winners.push(userId)
        const rank = groupTask.winners.length || 1 ;

        groupMember.completionStatus = 'completed';
        groupMember.rank = rank ;
        groupMember.completedAt = new Date()

        if(groupTask.members.length > 3 && rank < 4 && rank >= 1){
            if(rank == 1){
                updateOverAllScore(userId, 'firstInGroupTask')
            }
            else if(rank == 2){
                updateOverAllScore(userId, 'secondInGroupTask')
            }
            else if(rank == 3){
                updateOverAllScore(userId, 'thirdInGroupTask')
            }
        }else{
            updateOverAllScore(userId, 'completedGroupTask')
        }

        await groupMember.save();
        await groupTask.save();
        await invalidate_groupTask_cache_of_multiple_users(groupTask.members)
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
        if(groupTask.status == 'completed') throw new ApiError(400, "Group task is already completed, now you cannot participate in it !!")
        if(new Date(groupTask.dueDate) <= new Date()) throw new ApiError(400, "Due date of the public task is already reached, so cannot participate in it !!")
        
        const groupMember = await GroupTaskMember.create({
            groupTaskId,
            userId,
            role: 'participant',
            completionStatus: 'inProgress',
        })

        groupTask.members.push(userId)

        await groupTask.save();

        updateOverAllScore(userId, 'participatedInPublicGroupTask')

        await invalidate_groupTask_cache(userId)
        await invalidate_publicGroupTask_cache()

        res.status(200).json(200, groupMember, "Successfully entered in the group task !!")
    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || 'There was some error in participating in this groupTask !!'})
    }
}

const toggleGroupTaskStatus = async(req, res) => {
    try {

        const {groupTaskId} = req.params;
        if(!groupTaskId) {
            throw new ApiError(400, "Please provide a valid group task id !!")
        }

        const userId = req.user._id
        
        const groupTask = await GroupTask.findById(groupTaskId);

        if (groupTask.creatorId.toString() !== userId){
            throw new ApiError(403, "You are not permitted to perform this action as you are not the admin !!")
        }

        groupTask.status = 'completed'

        await groupTask.save();

        if(groupTask.type == 'public'){
            await invalidate_publicGroupTask_cache()
        }

        await invalidate_groupTask_cache(userId);

        res.status(200).json(new ApiResponse(200, 'OK', 'Successfully toggled your group task status !!'))
    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || 'There was some error in toggling your groupTask !!'})
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
    createGroupTask,
    getMyGroupTasks,
    getPublicGroupTasks,
    deleteGroupTask,
    editGroupTask,
    markCompleted,
    participateInPublicGroupTask,
    getMembersOfGroupTask,
    toggleGroupTaskStatus,
 //   sendInviteToConnectionForGroupTask,
 //   actionToInviteForGroupTask
}