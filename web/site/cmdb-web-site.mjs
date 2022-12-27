// Module that contains the functions that handle all HTTP Requests
// Handle HTTP request means:
//  - Obtain data from requests. Request data can be obtained from: URI(path, query, fragment), headers, body
//  - Invoke the corresponding operation on services
//  - Generate the response in HTML format

import { group } from 'console'
import url from 'url'
import errors from '../../errors/errors.mjs'
import translateToHTTPResponse from '../http-error-responses.mjs'

// Retrieves the relative path to the file
const __dirname = url.fileURLToPath(new URL('.', import.meta.url)) 

export default function (cmdbServices) {
    // Validate if all the received services exist
    if (!cmdbServices) {
        throw errors.INVALID_ARGUMENT("cmdbServices")
    }

    return {
//       getHome: getHome,
//       getCss: getCss,
       getPopularMovies: handleResponseInHTML(getPopularMoviesInternal),
//       createUser: handleResponseInHTML(createUserInternal),
       searchMoviesByName: handleResponseInHTML(searchMoviesByNameInternal),
       getMovieDetails: handleResponseInHTML(getMovieDetailsInternal),
       createGroup: handleResponseInHTML(createGroupInternal),
       getNewGroup: getNewGroup,
       getGroups: handleResponseInHTML(getGroupsInternal),
       getGroupDetails: handleResponseInHTML(getGroupDetailsInternal),
       editGroup: handleResponseInHTML(editGroupInternal),
       getEditGroup: handleResponseInHTML(getEditGroup),
       deleteGroup: handleResponseInHTML(deleteGroupInternal),
       addMovieInGroup: handleResponseInHTML(addMovieInGroupInternal),
       addMovie: addMovie,
//       removeMovieInGroup: handleResponseInHTML(removeMovieInGroupInternal)
    }

    async function getPopularMoviesInternal(req, rsp) {
        const popularMovies = await cmdbServices.getPopularMovies(req.query.limit)
        const viewData = {title: 'Popular Movies', movies: popularMovies}
        return View('popularMovies', viewData)
    }

    async function searchMoviesByNameInternal(req, rsp) {
        const movies = await cmdbServices.searchMoviesByName(req.params.moviesName, req.query.limit)
        const viewData = {title: movies.expression, movies: movies.results}
        return View('searchMovies', viewData)
    }

    async function getMovieDetailsInternal(req, rsp) {
        const movie = await cmdbServices.getMovieDetails(req.params.movieId)
        return View('movie', movie)
    }

    async function createGroupInternal(req, rsp) {
        let newGroup = await cmdbServices.createGroup(req.token, req.body)
        rsp.redirect('/groups')
    }

    async function getNewGroup(req, rsp) {
        rsp.render('newGroup')
    }

    async function getGroupsInternal(req, rsp) {
        const groups = await cmdbServices.getGroups(req.token)
        const viewData = { title: 'All groups', groups: groups}
        return View('groups', viewData)
    }

    async function getGroupDetailsInternal(req, rsp) {
        const groupId = req.params.groupId
        const group = await cmdbServices.getGroupDetails(req.token, groupId)
        const viewData = {id: groupId, group: group}
        return View('group', viewData)
    }

    async function editGroupInternal(req, rsp) {
        const groupId = req.params.groupId
        const group = await cmdbServices.editGroup(req.token, groupId, req.body)
        rsp.redirect(`/groups/${groupId}`)
    }

    async function getEditGroup(req, rsp) {
        const groupId = req.params.groupId
        const group = await cmdbServices.getGroupDetails(req.token, groupId)
        const viewData = {id: groupId, group: group}
        return View('editGroup', viewData)
    }

    async function deleteGroupInternal(req, rsp) {
        const groupId = req.params.groupId
        const group = await cmdbServices.deleteGroup(req.token, groupId)
        rsp.redirect('/groups')
    }

    async function addMovieInGroupInternal(req, rsp) {
        const movieId = req.body.movieId
        const groupId = req.params.groupId
        const movie = await cmdbServices.addMovieInGroup(req.token, groupId, movieId)
        rsp.redirect(`/groups/${groupId}`)
    }

    async function addMovie(req, rsp) {
        const groupId = req.params.groupId
        rsp.render('addMovie', {id: groupId})
    }

    // Example - to delete
    async function createTask(req, rsp) {
        // Post/Redirect/Get (PRG) is a web development design pattern that lets the page shown 
        // after a form submission be reloaded, shared, or bookmarked without ill effects, such
        // as submitting the form another time.
        rsp.redirect('/groups')
    }

    /**
     * Sends a file from the location given by filename current directory
     * @param {String} fileName end segment of the file path
     * @param {*} rsp response object
     */  
    function sendFile(fileName, rsp) {
        const fileLocation = __dirname + 'public/' + fileName
        rsp.sendFile(fileLocation)
    }
  
    /** 
     * Constructs a new View with the given name and data to send to response render function
     * @param {*} viewName - identifies the uri end segment
     * @param {*} viewData - object with data to send 
     */
    function View(viewName, viewData) {
        return {
            name: viewName,
            data: viewData
        }
    }

    function handleResponseInHTML(handler) {
        return async function(req, rsp) {
            // Hammered token
            req.token = "c64ae5a8-6f3e-11ed-a1eb-0242ac120002"

            try {
                let view = await handler(req, rsp)
                if (view) {
                    // Wrap the result in JSON format 
                    rsp.render(view.name , view.data)
                }
            } catch(e) {
                const httpResponse = translateToHTTPResponse(e)
                rsp.render(httpResponse.status, httpResponse.body);
            }
        }
    }
}