// Application services unit tests module

'use strict'

// External Imports
import * as assert from "assert"

// Internal Imports
import * as File from "#data_access/util/file-operations.mjs"
import cmdbUsersDataInternalInit from '#data_access/internal/cmdb-users-mem.mjs'
import cmdbDataInternalInit from '#data_access/internal/cmdb-data-mem.mjs'
import imdbDataInit from '#data_access/imdb-movies-data.mjs'
import cmdbUserServicesInit from '#services/cmdb-users-services.mjs'
import cmdbServicesInit from '#services/cmdb-services.mjs'
import fetch from '#data_access/fetch/local-fetch.mjs'
import errors from '#errors/errors.mjs'
import { Group, GroupDetails, Movie, MovieDetails } from '#data_manipulation/classes.mjs'

// Initializations
const usersData = cmdbUsersDataInternalInit()
const cmdbData = cmdbDataInternalInit()
const imdbData = imdbDataInit(fetch)
const cmdbUserServices = cmdbUserServicesInit(usersData)
const cmdbServices = cmdbServicesInit(imdbData, cmdbData, usersData)

// Paths to local files
const POPULAR_MOVIES_FILE = "./data/local/most-popular-movies.json"
const SEARCH_MOVIE_BY_NAME_FILE = "./data/local/movies-searched-by-name.json"
const GET_MOVIE_BY_ID = "./data/local/movie-info.json"
const USERS_FILE = './data/local/users.json'
const GROUPS_FILE = './data/local/groups.json'

describe("Services test modules:", function() {
    // Constants
    const testUser = {
        username: "userTestUsername",
        password: "userTestPassword",
        passConfirm: "userTestPassword",
        email: "test@gmail.com"
    }
    
    // Global variables
    let originalUsers
    let originalGroups

    // Utility test functions:
    beforeEach(async () => {
        // Read current data
        originalUsers = await File.read(USERS_FILE)
        originalGroups = await File.read(GROUPS_FILE)
    })
    afterEach(async () => {
        // Restore previous data
        await File.write(originalUsers, USERS_FILE)   
        await File.write(originalGroups, GROUPS_FILE)               
    })
    
    describe("Getting the most popular movies:", function() {
        it("Should return an object with an array of the 250 most popular movies", async function() {
            // Arrange
            let most_popular_movies = await File.read(POPULAR_MOVIES_FILE)

            // Act
            let cmdb_most_popular_movies = await cmdbServices.getPopularMovies(250)

            // Assert
            assert.deepEqual(cmdb_most_popular_movies.results, most_popular_movies.items)
        })

        it("Should return an object with an array of the most popular movies within a limit", async function() {
            // Arrange
            let most_popular_movies = await File.read(POPULAR_MOVIES_FILE)
            most_popular_movies = most_popular_movies.items.filter(movie => movie.rank <= 5)

            // Act
            let cmdb_most_popular_movies = await cmdbServices.getPopularMovies(5)
            // Assert
            assert.deepEqual(cmdb_most_popular_movies.results, most_popular_movies)
        })

        it("Should throw an error if the limit is not a number", async function() {
            // Act
            try {
                await cmdbServices.getPopularMovies("Hello")
            } catch(e) {
                assert.deepEqual(e, errors.INVALID_ARGUMENT("limit"))
                return
            }
            // Assert
            assert.fail("Should throw an error")
        })

        it("Should throw an error if the page is not a number", async function() {
            // Act
            try {
                await cmdbServices.getPopularMovies(5, "a")
            } catch(e) {
                assert.deepEqual(e, errors.ARGUMENT_NOT_FOUND("page"))
                return
            }
            // Assert
            assert.fail("Should throw an error")
        })
    })

    describe("Search a movie by its name:", function() {
        it("Should return an object with the results from a movie's name search", async function() {
            // Arrange
            let search_by_name = await File.read(SEARCH_MOVIE_BY_NAME_FILE)
            search_by_name = search_by_name.results

            // Act
            let cmdb_search_by_name = await cmdbServices.searchMoviesByName("inception 2010")
            
            // Assert
            assert.deepEqual(cmdb_search_by_name.results, search_by_name)
        })

        it("Should return an object with the results from a movie's name search within a limit", async function() {
            // Arrange
            let search_by_name = await File.read(SEARCH_MOVIE_BY_NAME_FILE)
            search_by_name = search_by_name.results.splice(0,5)

            // Act
            let cmdb_search_by_name = await cmdbServices.searchMoviesByName("inception 2010", 5)

            // Assert
            assert.deepEqual(cmdb_search_by_name.results, search_by_name)
        })

        it("Should throw an error if the limit is not a number", async function() {
            // Act
            try {
                await cmdbServices.searchMoviesByName("inception 2010", "f")
            } catch(e) {
                assert.deepEqual(e, errors.INVALID_ARGUMENT("limit"))
                return
            }

            // Assert
            assert.fail("Should throw an error")
        })

        it("Should throw an error if the page is not a number", async function() {
            // Act
            try {
                await cmdbServices.searchMoviesByName("inception 2010", 10, "c")
            } catch(e) {
                assert.deepEqual(e, errors.ARGUMENT_NOT_FOUND("page"))
                return
            }

            // Assert
            assert.fail("Should throw an error")
        })
    })

    describe("Get movie details using a movieId:", function() {
        it("Should return an object with the results from a movie fetch by Id", async function() {
            // Arrange
            let movieObj = await File.read(GET_MOVIE_BY_ID)
                    
            // Act
            let movie = new MovieDetails(movieObj)
            let cmdb_movie = await cmdbServices.getMovieDetails(movieObj.id)
            
            // Assert
            assert.deepEqual(movie, cmdb_movie)
        })
    })

    describe("Create a new user:", function() {
        it("Should create a new user", async function() {
            // Arrange
            let users = await File.read(USERS_FILE)

            // Act
            users.users.push({
                id: originalUsers.IDs + 1,
                username: testUser.username,
                password: testUser.password
            })
            users.IDs++

            await cmdbUserServices.createUser(
                testUser.username, testUser.password, testUser.email, testUser.passConfirm
            )
            let newUsers = await File.read(USERS_FILE)
            
            // Assert
            assert.deepEqual(users.id, newUsers.id)
            assert.deepEqual(users.usernames, newUsers.usernames)
            assert.deepEqual(users.passwords, newUsers.passwords)
            // Cannot check token as it is randomly given
        })

        it("Try to create the same user twice", async function() {
            // Create an user 
            await cmdbUserServices.createUser(
                testUser.username, testUser.password, testUser.email, testUser.passConfirm
            )
            // Try to create the same user again
            try {
                await cmdbUserServices.createUser(
                    testUser.username, testUser.password, testUser.email, testUser.passConfirm
                )
            } catch (e) {
                assert.deepEqual(e, errors.INVALID_USER("already exists"))
                return
            }
            assert.fail("Should throw an error")
        })
        it("Create an user with an invalid username", async function() {

            try {
                // Create an user
                await cmdbUserServices.createUser(
                    1, testUser.password, testUser.email, testUser.passConfirm
                )
            } catch (e) {
                assert.deepEqual(e, errors.INVALID_ARGUMENT("username, password or email"))
                return
            }
            assert.fail("Should throw an error")
        })
        it("Create an user with an invalid password", async function() {
            try {
                // Create an user
                await cmdbUserServices.createUser(
                    testUser.username, [12, 32, "id"], testUser.email, testUser.passConfirm
                )
            } catch (e) {
                assert.deepEqual(e, errors.INVALID_ARGUMENT("username, password or email"))
                return
            }
            assert.fail("Should throw an error")
        })
        it("Create an user with an invalid email domain address", async function() {
            try {
                // Create an user
                await cmdbUserServices.createUser(
                    testUser.username, testUser.password, "adadad@gmaill.com", testUser.passConfirm
                )
            } catch (e) {
                assert.deepEqual(e, errors.EMAIL_IS_NOT_VALID())
                return
            }
            assert.fail("Should throw an error")
        })
        it("Create an user with an invalid confirm password", async function() {
            try {
                // Create an user
                await cmdbUserServices.createUser(
                    testUser.username, testUser.password, testUser.email, 71
                )
            } catch (e) {
                assert.deepEqual(e, errors.PASSWORDS_DO_NOT_MATCH("passwords do not match"))
                return
            }
            assert.fail("Should throw an error")
        })
    })

    describe("Create a group for an user:", function() {
        it("Should create a new group for the specified user", async function() {           
            // Act
            await cmdbUserServices.createUser(
                testUser.username, testUser.password, testUser.email, testUser.passConfirm
            )
            const createdUser = await cmdbUserServices.getUserByUsername(testUser.username)
            let currentGroups = await File.read(GROUPS_FILE)
            let groupToCreate = new Group({
                id: currentGroups.IDs++,
                name: "Group Test",
                description: "Just for test",
                userId: createdUser.id
            })

            currentGroups.groups.push(groupToCreate)

            await cmdbServices.createGroup(createdUser.token, groupToCreate)

            let alteredGroups = await File.read(GROUPS_FILE)

            // Assert 
            assert.deepEqual(currentGroups, alteredGroups)
        })

        it("Should not create a new group for the specified user", async function() {
            // Arrange
            let invalidGroup = {
                notAName: "Group 56",
                description: 1234,
            }

            // Act
            await cmdbUserServices.createUser(
                testUser.username, testUser.password, testUser.email, testUser.passConfirm
            )
            const createdUser = await cmdbUserServices.getUserByUsername(testUser.username)

            // Assert
            try {
                await cmdbServices.createGroup(createdUser.token, invalidGroup)
            } catch(e) {
                assert.deepEqual(e, errors.INVALID_ARGUMENT("group missing a valid name and description"))
                return
            }
            assert.fail("Should throw an error")
        })
    })

    describe("Get all groups for an user:", function() {
        it("Should get all groups for the specified user", async function() {
            // Arrange
            let groupsTest = []
            let group1 = {
                id: originalGroups.IDs,
                name: "Test group 1",
                description: "random"
            }
            let group2 = { 
                id: originalGroups.IDs + 2, 
                name: "Test group 2",
                description: "still random"
            }

            // Act
            await cmdbUserServices.createUser(
                testUser.username, testUser.password, testUser.email, testUser.passConfirm
            )
            const createdUser = await cmdbUserServices.getUserByUsername(testUser.username)
            
            // Create groups for this user
            await cmdbServices.createGroup(createdUser.token, group1)
            await cmdbServices.createGroup(createdUser.token, group2)

            groupsTest.push(group1, group2)
            groupsTest = groupsTest.map(group => { 
                return {
                    id: group.id,
                    name: group.name,
                    description: group.description
                }
            })

            // Retrieve the group created
            let groups = await cmdbServices.getGroups(createdUser.token) 

            // Assert 
            assert.deepEqual(groupsTest, groups.results)   
        })
        it("Should throw an error if the limit is not a number", async function() {
            // Arrange
            let groupsTest = []
            let group1 = {
                id: originalGroups.IDs + 1,
                name: "Test group 1",
                description: "random"
            }
            let group2 = {
                id: originalGroups.IDs + 2,
                name: "Test group 2",
                description: "still random"
            }

            // Act
            await cmdbUserServices.createUser(
                testUser.username, testUser.password, testUser.email, testUser.passConfirm
            )
            const createdUser = await cmdbUserServices.getUserByUsername(testUser.username)
            
            // Create groups for this user
            await cmdbServices.createGroup(createdUser.token, group1)
            await cmdbServices.createGroup(createdUser.token, group2)

            groupsTest.push(group1, group2)
            groupsTest = groupsTest.map(group => {
                return {
                    id: group.id,
                    name: group.name,
                    description: group.description
                }
            })

            // Assert 
            
            try {
                await cmdbServices.getGroups(createdUser.token, "a") 
            } catch(e) {
                assert.deepEqual(e, errors.INVALID_ARGUMENT("limit"))
                return
            }
            assert.fail("Should throw an error")
        })

        it("Should throw an error if the page is not a number", async function() {
            // Arrange
            let groupsTest = []
            let group1 = {
                id: originalGroups.IDs + 1, 
                name: "Test group 1",
                description: "random"
            }
            let group2 = {
                id: originalGroups.IDs + 2,
                name: "Test group 2",
                description: "still random"
            }

            // Act
            await cmdbUserServices.createUser(
                testUser.username, testUser.password, testUser.email, testUser.passConfirm
            )
            const createdUser = await cmdbUserServices.getUserByUsername(testUser.username)
            
            // Create groups for this user
            await cmdbServices.createGroup(createdUser.token, group1)
            await cmdbServices.createGroup(createdUser.token, group2)

            groupsTest.push(group1, group2)
            groupsTest = groupsTest.map(group => {
                return {
                    id: group.id,
                    name: group.name,
                    description: group.description
                }
            })

            // Assert 
            try {
                await cmdbServices.getGroups(createdUser.token, 1, {page: "a"}) 
            } catch(e) {
                assert.deepEqual(e, errors.ARGUMENT_NOT_FOUND("page"))
                return
            }
            assert.fail("Should throw an error")
        })

    })

    describe("Get group details for an user:", function() {
        it("Should get all the group details for the specified user", async function() {
            // Arrange
            let group = {
                name: "Test group 1",
                description: "random"
            }
            let groupId = originalGroups.IDs + 1

            // Act
            await cmdbUserServices.createUser(
                testUser.username, testUser.password, testUser.email, testUser.passConfirm
            )
            const createdUser = await cmdbUserServices.getUserByUsername(testUser.username)

            // Create groups for this user
            await cmdbServices.createGroup(createdUser.token, group)
            // Retrieve the group created
            const sut = await cmdbServices.getGroupDetails(createdUser.token, groupId) 
            // Create movie object
            const movies = {
                results: [], // No movies were added yet
                totalPages: 0 
            }
            // Create the expected group
            const expected = new GroupDetails(group, movies)
           
            // Assert 
            assert.deepEqual(sut, expected)
        })

        it("Should throw an error if the group Id does not exist", async function() {
            // Arrange
            let group = {
                name: "Test group 1",
                description: "random"
            }
            let groupId = -1

            // Act
            await cmdbUserServices.createUser(
                testUser.username, testUser.password, testUser.email, testUser.passConfirm
            )
            const createdUser = await cmdbUserServices.getUserByUsername(testUser.username)

            // Create groups for this user
            await cmdbServices.createGroup(createdUser.token, group)
            try {
                await cmdbServices.getGroupDetails(createdUser.token, groupId) 
            } catch(e) {
                assert.deepEqual(e, errors.ARGUMENT_NOT_FOUND("group"))
                return
            }

            // Assert
            assert.fail("Should throw an error")
        })
    })

    describe("Edit a Group:", function() {
        it("Should edit a group by Id", async function() {
            // Arrange
            const groupBodyTest = {
                name: "Group Test",
                description: "Just for test",
            }
            const groupBodyUpdatedTest = {
                name: "New Group Test",
                description: "Updated group"
            }

            // Arrange
            const newGroupId = originalGroups.IDs + 1
            const groupTest = new Group ({
                name: "New Group Test",
                description: "Updated group",
                userId: originalUsers.IDs + 1,
                id: newGroupId,
                movies: []
            })

            // Act
            await cmdbUserServices.createUser(
                testUser.username, testUser.password, testUser.email, testUser.passConfirm
            )
            const createdUser = await cmdbUserServices.getUserByUsername(testUser.username)

            await cmdbServices.createGroup(createdUser.token, groupBodyTest)
            await cmdbServices.editGroup(createdUser.token, newGroupId, groupBodyUpdatedTest)

            let cmdb_edit_movie_to_group = await File.read(GROUPS_FILE)
            cmdb_edit_movie_to_group = cmdb_edit_movie_to_group.groups.find(group => group.id == newGroupId)

            // Assert
            assert.deepEqual(cmdb_edit_movie_to_group, groupTest)
        })

        it("Should throw an error if the groupId doesn't exist", async function() {
            // Arrange
            const groupBodyTest = {
                name: "Group Test",
                description: "Just for test",
            }
            const groupBodyUpdatedTest = {
                name: "New Group Test",
                description: "Updated group"
            }
            const newGroupId = originalGroups.IDs + 4

            // Act
            try {
                await cmdbUserServices.createUser(
                    testUser.username, testUser.password, testUser.email, testUser.passConfirm
                )
                const createdUser = await cmdbUserServices.getUserByUsername(testUser.username)
                await cmdbServices.createGroup(createdUser.token, groupBodyTest)
                await cmdbServices.editGroup(createdUser.token, newGroupId, groupBodyUpdatedTest)
            } catch(e) {
                assert.deepEqual(e, errors.ARGUMENT_NOT_FOUND("group"))
                return
            }

            // Assert
            assert.fail("Should throw an error")
        })
    })

    describe("Delete a Group:", function() {
        it("Should delete a group by Id", async function() {
            // Arrange
            const groupBodyTest = {
                name: "Group Test",
                description: "Just for test",
            }

            // Arrange
            const newGroupId = originalGroups.IDs + 1

            // Act
            await cmdbUserServices.createUser(
                testUser.username, testUser.password, testUser.email, testUser.passConfirm
            )
            const createdUser = await cmdbUserServices.getUserByUsername(testUser.username)
            await cmdbServices.createGroup(createdUser.token, groupBodyTest)
            await cmdbServices.deleteGroup(createdUser.token, newGroupId)

            let cmdb_remove_movie_to_group = await File.read(GROUPS_FILE)
            cmdb_remove_movie_to_group = cmdb_remove_movie_to_group.groups

            // Assert
            assert.deepEqual(cmdb_remove_movie_to_group, originalGroups.groups)
        })

        it("Should throw an error if the groupId doesn't exist", async function() {
            // Arrange
            const groupBodyTest = {
                name: "Group Test",
                description: "Just for test",
            }

            //Act
            try {
                await cmdbUserServices.createUser(
                    testUser.username, testUser.password, testUser.email, testUser.passConfirm
                )
                const createdUser = await cmdbUserServices.getUserByUsername(testUser.username)
                await cmdbServices.createGroup(createdUser.token, groupBodyTest)
                await cmdbServices.deleteGroup(createdUser.token, -1)
            } catch(e) {
                assert.deepEqual(e, errors.ARGUMENT_NOT_FOUND("group"))
                return
            }

            // Assert
            assert.fail("Should throw an error")
        })
    })

    describe("Adding a Movie in a Group:", function() {
        it("Should add a new movie to the given group Id", async function() {
            // Arrange
            const groupBodyTest = {
                name: "Group Test",
                description: "Just for test",
            }

            // Arrange
            const newGroupId = originalGroups.IDs + 1
            const groupTest = new Group({
                name: "Group Test",
                description: "Just for test",
                userId: originalUsers.IDs + 1,
                id: newGroupId,
                movies: []
            })

            groupTest.movies.push(new Movie({
                id: "tt0468569",
                title: "The Dark Knight",
                runtimeMins: "152"
            }))

            // Act
            await cmdbUserServices.createUser(
                testUser.username, testUser.password, testUser.email, testUser.passConfirm
            )
            const createdUser = await cmdbUserServices.getUserByUsername(testUser.username)
            await cmdbServices.createGroup(createdUser.token, groupBodyTest)
            await cmdbServices.addMovieInGroup(createdUser.token, newGroupId, "tt0468569")

            let cmdb_add_movie_to_group = await File.read(GROUPS_FILE)
            cmdb_add_movie_to_group = cmdb_add_movie_to_group.groups.find(group => group.id == newGroupId)

            // Assert
            assert.deepEqual(cmdb_add_movie_to_group, groupTest)
        })

        it("Should not add a movie that was already added", async function() {
            // Arrange
            const groupBodyTest = {
                name: "Group Test",
                description: "Just for test",
            }

            // Arrange
            const newGroupId = originalGroups.IDs + 1

            try {
                await cmdbUserServices.createUser(
                    testUser.username, testUser.password, testUser.email, testUser.passConfirm
                )
                const createdUser = await cmdbUserServices.getUserByUsername(testUser.username)
                await cmdbServices.createGroup(createdUser.token, groupBodyTest)
                // Add movie to the group
                await cmdbServices.addMovieInGroup(createdUser.token, newGroupId, "tt0468569")
                // Try to add the same movie to the group
                await cmdbServices.addMovieInGroup(createdUser.token, newGroupId, "tt0468569")
            } catch(e) {
                assert.deepEqual(e, errors.INVALID_ARGUMENT("movie already exists in this group"))
                return
            }
            // Assert
            assert.fail("Should throw an error")

        })

        it("Should throw an error if the groupId doesn't exist", async function() {
            // Arrange
            const groupBodyTest = {
                name: "Group Test",
                description: "Just for test",
            }

            // Act
            try {
                await cmdbUserServices.createUser(
                    testUser.username, testUser.password, testUser.email, testUser.passConfirm
                )
                const createdUser = await cmdbUserServices.getUserByUsername(testUser.username)
                await cmdbServices.createGroup(createdUser.token, groupBodyTest)
                await cmdbServices.addMovieInGroup(createdUser.token, -1, "tt0468569")
            } catch(e) {
                assert.deepEqual(e, errors.ARGUMENT_NOT_FOUND("group"))
                return
            }

            // Assert
            assert.fail("Should throw an error")
        })

        it("Should throw an error if the movieId doesn't exist", async function() {
            // Arrange
            const groupBodyTest = {
                name: "Group Test",
                description: "Just for test",
            }
            const newGroupId = originalGroups.IDs + 1

            // Act
            try {
                await cmdbUserServices.createUser(
                    testUser.username, testUser.password, testUser.email, testUser.passConfirm
                )
                const createdUser = await cmdbUserServices.getUserByUsername(testUser.username)
                await cmdbServices.createGroup(createdUser.token, groupBodyTest)
                await cmdbServices.addMovieInGroup(createdUser.token, newGroupId, "468569")
            } catch(e) {
                assert.deepEqual(e, errors.ARGUMENT_NOT_FOUND("Movie"))
                return
            }

            // Assert
            assert.fail("Should throw an error")
        })
    })

    describe("Removing a Movie in a Group:", function() {
        it("Should remove a movie from the given group Id", async function() {
            // Arrange
            const groupBodyTest = {
                name: "Group Test",
                description: "Just for test",
            }

            // Arrange
            const newGroupId = originalGroups.IDs + 1
            const groupTest = new Group({
                name: "Group Test",
                description: "Just for test",
                userId: originalUsers.IDs + 1,
                id: newGroupId,
                movies: [
                    {
                        id: "tt0468569",
                        title: "The Dark Knight",
                        runtimeMins: "152"
                    }
                ]
            })

            groupTest.movies.pop(new Movie({
                id: "tt0468569",
                title: "The Dark Knight",
                runtimeMins: "152"
            }))

            // Act
            await cmdbUserServices.createUser(
                testUser.username, testUser.password, testUser.email, testUser.passConfirm
            )
            const createdUser = await cmdbUserServices.getUserByUsername(testUser.username)
            await cmdbServices.createGroup(createdUser.token, groupBodyTest)
            await cmdbServices.addMovieInGroup(createdUser.token, newGroupId, "tt0468569")
            await cmdbServices.removeMovieInGroup(createdUser.token, newGroupId, "tt0468569")

            let cmdb_remove_movie_to_group = await File.read(GROUPS_FILE)
            cmdb_remove_movie_to_group = cmdb_remove_movie_to_group.groups.find(group => group.id == newGroupId)

            // Assert
            assert.deepEqual(cmdb_remove_movie_to_group, groupTest)
        })

        it("Should throw an error if the groupId doesn't exist", async function() {
            // Arrange
            const groupBodyTest = {
                name: "Group Test",
                description: "Just for test",
            }
            const newGroupId = originalGroups.IDs + 1

            // Act
            try {
                await cmdbUserServices.createUser(
                    testUser.username, testUser.password, testUser.email, testUser.passConfirm
                )
                const createdUser = await cmdbUserServices.getUserByUsername(testUser.username)
                await cmdbServices.createGroup(createdUser.token, groupBodyTest)
                await cmdbServices.addMovieInGroup(createdUser.token, newGroupId, "tt0468569")
                await cmdbServices.removeMovieInGroup(createdUser.token, -1, "tt0468569")
            } catch(e) {
                assert.deepEqual(e, errors.ARGUMENT_NOT_FOUND("group"))
                return
            }

            // Assert
            assert.fail("Should throw an error")
        })

        it("Should throw an error if the movieId doesn't exist", async function() {
            // Arrange
            const groupBodyTest = {
                name: "Group Test",
                description: "Just for test",
            }
            const newGroupId = originalGroups.IDs + 1

            // Act
            try {
                await cmdbUserServices.createUser(
                    testUser.username, testUser.password, testUser.email, testUser.passConfirm
                )
                const createdUser = await cmdbUserServices.getUserByUsername(testUser.username)
                await cmdbServices.createGroup(createdUser.token, groupBodyTest)
                await cmdbServices.addMovieInGroup(createdUser.token, newGroupId, "tt0468569")
                await cmdbServices.removeMovieInGroup(createdUser.token, newGroupId, "468569")
            } catch(e) {
                assert.deepEqual(e, errors.ARGUMENT_NOT_FOUND("movie"))
                return
            }

            // Assert
            assert.fail("Should throw an error")
        })        
    })
})