// Module that manages application user data.
// Access to cmdb data (groups and users), in this version stored in memoty

'use strict'


import errors from '../errors/errors.mjs'
import * as fileOperation from './read&write.mjs'

const GROUPS_FILE = './local_data/groups.json'


export async function createGroupData(obj, userId){
    let groupsObj = await fileOperation.readFromFile(GROUPS_FILE)

    groupsObj.groups.forEach(group => {
        if (group.name == obj.name && group.userId == userId) 
            throw errors.INVALID_ARGUMENT("group already exists")
    })
    obj.id = getNewId(groupsObj.IDs)
    obj.movies = []
    obj.userId = userId
    groupsObj.groups.push(obj)
    groupsObj.IDs++
    return fileOperation.writeToFile(groupsObj, GROUPS_FILE)
}

export async function getGroupsData(userId){
    let groupsObj = await fileOperation.readFromFile(GROUPS_FILE)
    
    groupsObj.groups = groupsObj.groups
        .filter(group => group.userId == userId)
        .map(group => {
            return {
                name: group.name,
                description: group.description
            }
        })
    return groupsObj.groups
}

export async function getGroupDetailsData(groupId, userId){

    let groupsObj = await fileOperation.readFromFile(GROUPS_FILE)
    let totalDuration = 0

    let group = groupsObj.groups.find(group => groupId == group.id && userId == group.userId)
    if (group == undefined) {
        throw errors.ARGUMENT_NOT_FOUND("group")
    }
    let newGroup = {
        name: group.name,
        description: group.description,
        movies: group.movies.map(movie => {
            totalDuration += Number(movie.duration)
            return {title: movie.title}
        }),
        moviesTotalDuration: totalDuration
    }
    return newGroup
}

export async function editGroupData(groupId, obj, userId){
    let groupsObj = await fileOperation.readFromFile(GROUPS_FILE)
    let found = false
    
    groupsObj.groups = groupsObj.groups.map(group => {
        if(group.id == groupId && group.userId == userId){
            group.name = obj.name
            group.description = obj.description
            found = true
        }
        return group
    })
    if (!found){
        throw errors.ARGUMENT_NOT_FOUND("group")
    }
    return fileOperation.writeToFile(groupsObj, GROUPS_FILE)
}

export async function deleteGroupData(groupId, userId){
    let groupsObj = await fileOperation.readFromFile(GROUPS_FILE)
    let groupIndex = groupsObj.groups.findIndex(group => group.id == groupId && group.userId == userId)
    if (groupIndex < 0){
        throw errors.ARGUMENT_NOT_FOUND("group")
    } else {
        groupsObj.groups.splice(groupIndex, 1) 
        return fileOperation.writeToFile(groupsObj, GROUPS_FILE) 
    }  
}

export async function addMovieInGroupData(groupId, movieId, moviesObj, userId){
        // Read from files:
        let groupsObj = await fileOperation.readFromFile(GROUPS_FILE)
    
    
        // Booleans:
        let foundMovie = false
        let foundGroup = false
    
        let newMovie = {}
    
        groupsObj.groups = groupsObj.groups.map(group =>{ 
            if (group.id == groupId && group.userId == userId) {
                foundGroup = true
                if (group.movies.find(movie => movie.id == movieId) != undefined) {
                    throw errors.INVALID_ARGUMENT("movie already exists in this group")
                }
                
                if (moviesObj != undefined) {
                    foundMovie = true
                    newMovie = {
                        id: moviesObj.id,
                        title: moviesObj.title,
                        duration: moviesObj.runtimeMins
                    }
                    group.movies.push(newMovie)
                }
            }
            return group
        }) 
        if(foundMovie && foundGroup) {
            await fileOperation.writeToFile(groupsObj, GROUPS_FILE)
            return newMovie
        }
        else if(!foundGroup){
            throw errors.ARGUMENT_NOT_FOUND("group")
        }
        else {
            throw errors.ARGUMENT_NOT_FOUND("movie")
        }
}

export async function removeMovieInGroupData(groupId, movieId, userId){
    let groupsObj = await fileOperation.readFromFile(GROUPS_FILE)
    let group = groupsObj.groups.find(group => groupId == group.id && group.userId == userId)
    if (group != undefined) {
        let movieIndex = group.movies.findIndex(movie => movie.id == movieId)
        if (movieIndex < 0){
            throw errors.ARGUMENT_NOT_FOUND("movie")
        } 
        else {
            group.movies.splice(movieIndex, 1)
            return fileOperation.writeToFile(groupsObj, GROUPS_FILE)
        }
    } else {
        throw errors.ARGUMENT_NOT_FOUND("group")
    }
}



function getNewId(NumIDs) {

    return ++NumIDs
}
