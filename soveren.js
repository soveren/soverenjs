'use strict'

class Soveren {
    /**
     * Constructs Soveren object
     * @param IPFS
     * @param OrbitDB
     * @param ipfsRepo path to the local IPFS repository
     */
    constructor (IPFS, OrbitDB, ipfsRepo='./ipfs') {
        this.IPFS = IPFS
        this.OrbitDB = OrbitDB
        this.ipfsRepo = ipfsRepo
    }

    /**
     * Creates and initializes Soveren node
     * @returns {Promise<Object>}
     */
    async create () {
        try {
            this.ipfs = await this.IPFS.create({
                preload: {enabled: false},
                repo: this.ipfsRepo,
                EXPERIMENTAL: {pubsub: true},
                config: {
                    Bootstrap: [],
                    Addresses: {Swarm: []}
                }
            })

            // this.node.on('error', (e) => { throw (e) })
            // this.node.on('ready', this._init.bind(this))

            await this.ipfs.start();
            this.orbitdb = await this.OrbitDB.createInstance(this.ipfs)
            this.defaultOptions = {write: [this.orbitdb.identity.id]}
            // console.log('orbitdb', this.orbitdb.id, this.orbitdb.id.length)

            this.profile = await this.orbitdb.kvstore('profile', this.defaultOptions)
            await this.profile.load()

            this.following = await this.orbitdb.kvstore('following', this.defaultOptions)
            await this.following.load()
            await this.profile.set('following', this.following.id)

            this.posts = await this.orbitdb.feed('posts', this.defaultOptions)
            await this.posts.load()
            await this.profile.set('posts', this.posts.id)

            return this

        } catch(e) {
            throw (e)
        }
    }

    getProfileId() {
        return this.profile.id
    }

    /**
     * Deletes profile's field
     * @param key
     * @returns {Promise<*>} cid
     */
    async deleteProfileField(key) {
        return await this.profile.del(key)
    }

    getProfileFields(uid=undefined) {
        if (!uid) return this.profile.all // all own fields
        //TODO get another profile by uid
        throw new Error('Incomplete')
    }

    getProfileField(key, uid=undefined) {
        if (!uid) return this.profile.get(key) // own field
        //TODO get another profile field by uid
        throw new Error('Incomplete')
    }

    /**
     *
     * @param key
     * @param value
     * @returns {Promise<*>} cid
     */
    async setProfileField(key, value) {
        return await this.profile.set(key, value)
    }

    async setProfileFields(fields) {
        const cids = {}
        for (let field of Object.keys(fields)) {
            cids[field] = await this.setProfileField(field, fields[field])
        }
        return cids
    }

    // Following

    /**
     * Follows user
     * @param uid
     * @returns {Promise<*>} cid
     */
    async follow(uid) {
        return await this.following.set(uid, uid)
    }

    /**
     * Un-follows user
     * @param uid
     * @returns {Promise<*>} cid
     */
    async unFollow(uid) {
        return await this.following.del(uid)
    }

    getFollowing() {
        return this.following.all
    }

    // Posts
    // Builds post's data to use then with addPost
    buildPostData( title, text, coverImages=[], files=[], product=undefined) {
        return {title:title, text:text, coverImages:coverImages, files:files, product:product}
    }

    /**
     * Adds a post
     * @param data
     * @param options
     * @returns {Promise<*>} cid
     */
    async addPost(data, options = {}) {
        // add likes counter
        const likesDbName = 'likesCounter.' + uuid()
        const likesDb = await this.orbitdb.counter(likesDbName, this.defaultOptions)
        data.likesCounter = likesDb.id

        // add re posts counter
        const rePostsDbName = 'rePostsCounter.' + uuid()
        const rePostsDb = await this.orbitdb.counter(rePostsDbName, this.defaultOptions)
        data.rePostsCounter = rePostsDb.id

        // add comments feed
        const commentsDbName = 'commentsFeed.' + uuid()
        const commentsDb = await this.orbitdb.feed(commentsDbName, this.defaultOptions)
        data.commentsFeed = commentsDb.id

        return await this.posts.add(data, options)
    }

    /**
     * Removes a post
     * @param hash
     * @param options
     * @returns {Promise<*>} cid
     */
    async removePost(hash, options = {}) {
        return this.posts.remove(hash, options)
    }

    getPost(hash) {
        return this.posts.get(hash)
    }

    getAllPosts() {
        return this.posts.iterator({ limit: -1 }).collect()
    }

    /**
     * Queries posts with an options https://github.com/orbitdb/orbit-db/blob/master/API.md#iteratoroptions-1
     * @param options
     * @returns {void|*} Posts array
     */
    queryPosts(options) {
        return this.posts.iterator(options).collect()
    }

    /**
     * Gets likes count of the post
     * @param post
     * @returns {Promise<number>} count
     */
    async getPostLikes(post) {
        const counter = await this.orbitdb.counter(post.likesCounter)
        await counter.load()
        return counter.value
    }

    /**
     * Likes a post
     * @param post
     * @returns {Promise<*>} cid
     */
    async likePost(post) {
        const counter = await this.orbitdb.counter(post.likesCounter)
        return await counter.inc()
    }

    /**
     * Gets all post's comments
     * @param post
     * @returns {Promise<LogEntry[]>} Array of all comments
     */
    async getPostComments(post) {
        const commentsDB = await this.orbitdb.feed(post.commentsFeed)
        await commentsDB.load()
        return commentsDB.iterator({ limit: -1 }).collect()
    }

    /**
     * Comments a post
     * @param post
     * @param commentText text of the comment
     * @param replyToCommentCid cid of the comment you want to reply
     * @param options
     * @returns {Promise<*>} cid
     */
    async commentPost(post, commentText, replyToCommentCid=undefined, options = {}) {
        const commentsDB = await this.orbitdb.counter(post.commentsFeed)
        const commentData = {commentText:commentText, replyToCommentCid:replyToCommentCid}
        return await commentsDB.add(commentData, options )
    }

    /**
     * Returns number of re posts
     * @param post
     * @returns {Promise<number>}
     */
    async getRePostsCount(post) {
        const counter = await this.orbitdb.counter(post.rePostsCounter)
        await counter.load()
        return counter.value
    }

    /**
     *  Re posts other person's post to own feed
     * @param userProfileId Id of another user's profile key-value database
     * @param postHash Hash od the post to re=post
     * @param remark Your remark on
     * @returns {Promise<string>}
     */
    async rePost(userProfileId, postHash, remark) {
        if (userProfileId===this.getProfileId()) throw new Error('You can not re post own posts')

        const rePost = {...post, }
        await this.addPost(rePost)
        const counter = await this.orbitdb.counter(post.likesCounter)
        return await counter.inc()
    }
    //TODO


    //- posts
    //getRePosts(pid)
    //rePost(pid, comment)

    //- messaging
    //sendMessage(uid, message)
    //onMessage(message)
    //getMessages(uid)

    //- donation
    //donateUser(uid)
    //donatePost(pid)
    //getUserDonations(uid)
    //getPostDonations(pid)

    //- shop
    //addProduct(product)
    //deleteProduct(pid)
    //buyProduct(pid)
    //rateProduct(pid, rating)
    //getProducts(uid)
    //getOwnProducts()



}

// try {
    const IpfsLibrary = require('ipfs')
    const OrbitDBLibrary = require('orbit-db')
    const { uuid } = require('uuidv4');

    module.exports = exports = new Soveren(IpfsLibrary, OrbitDBLibrary)
// } catch (e) {
//     console.error(e.message)
//     window.FW = new Soveren(window.Ipfs, window.OrbitDB)
// }