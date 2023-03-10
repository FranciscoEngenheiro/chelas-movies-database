// Module that uses node fetch module to retrieve resources from the web

'use strict'

import fetch from "node-fetch"

/**
 * Fetches specified resource from a container in the web.
 * @param {String} URL resource path to retrieve information from in the web.
 * @param {Object} options a set of options to modify the request.
 * @returns a promise that resolves to a JavaScript object of the result.
 */
export default async function(URL, options) {
    let fetched_obj = await fetch(URL, options)
    return fetched_obj.json()
}