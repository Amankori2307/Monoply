import { useEffect, useRef, useMemo, useCallback } from 'react';
import style from '../../../assets/css/player.module.css'
import { connect } from 'react-redux'
import { creditPlayerMoney, debitPlayerMoney, movePlayer, setIsMoving } from '../../../redux/actions/player'
import audio1 from '../../../assets/audio/playermove.wav'
import { setShowModal } from '../../../redux/actions/modal'
import { cardTypes, directions, modalTypes } from '../../../utility/constants'
import { setIsDone } from '../../../redux/actions/board'
import { getAllTurningPoints, calcRent, delay } from '../../../utility/playerUtility';
import { setPlayerPositionHelper } from '../../../utility/player/playerPositionUtility';

function Player({ playersData, diceSum, movePlayer, board, setDiceSumCalledCount, color, id, setShowModal, siteData, setIsDone, debitPlayerMoney, creditPlayerMoney, setIsMoving, noOfCardsInCategory }) {
    const isMounted = useRef(false)
    const firstRender = useRef(true)
    const currentPlayer = useRef(null)
    const positions = useRef(board.positions)
    const playerMoveAudio = useMemo(() => new Audio(audio1), [])
    const playerRef = useRef(null)
    const playersDataRef = useRef(playersData)
    const currentPlayerSite = playersData.players[id].site
    const siteDataRef = useRef(siteData)
    const isMoving = playersData.players[id].isMoving

    const setPlayerPosition = useCallback((site, playAudio) => {
        setPlayerPositionHelper({...positions.current[site]}, playersDataRef.current.players, playersDataRef.current.totalPlayers, id, playerRef.current, playerMoveAudio, playAudio)
    }, [playerMoveAudio, id])

    // To update player position in state(redux store) 
    useEffect(() => {
        if (isMounted.current && (playersDataRef.current.activePlayer === id)) {

            console.log("useEffect2 ID:" + id)
            let sum = diceSum + currentPlayer.current.site;
            let currentSite = sum < 40 ? sum : (sum - 40);
            movePlayer(id, currentSite, directions.FORWARD)
        }
    }, [diceSum, id, movePlayer, setDiceSumCalledCount, setShowModal]) // Adding setDiceSum because if precious set dice sum is equal to current dice sum it does not re render

    // To Show Approprate modal or do appropriate action
    const showAppropriateModalOrDoAppropriateAction = useCallback(() => {
        if (!firstRender.current && id === playersDataRef.current.activePlayer) {
            console.log("SHOW APPRO: ", id)
            let currentSiteId = currentPlayer.current.site
            let currentSite = siteDataRef.current.sites[currentSiteId]
            let {site: cs, previousSite: ps} = currentPlayer.current;
            if ([cardTypes.SITE, cardTypes.REALM_RAILS, cardTypes.UTILITY].includes(currentSite.type)) {
                let money = playersDataRef.current.players[id].money
                if (siteDataRef.current.boughtSites.includes(currentSite.id)) { // check if site is already bought
                    // If site is already bought check if it is mortaged and who owns it if some other user owns it pay rent
                    let boughtBy = siteDataRef.current.boughtBy[currentSiteId]
                    console.log("Bought By: ",boughtBy)
                    if(!currentSite.isMortgaged && boughtBy !== id){
                        let rent = calcRent(currentSite, siteDataRef.current.playersSites[boughtBy], diceSum, noOfCardsInCategory);
                        debitPlayerMoney(playersDataRef.current.activePlayer, rent);
                        creditPlayerMoney(boughtBy, rent);
                    }
                    
                    setIsDone(true)
                } else {
                    if (currentSite.sellingPrice <= money) {
                        setShowModal(true, modalTypes.BUY_CARD)
                    } else {
                        setShowModal(true, modalTypes.AUCTION_CARD)
                    }
                }
            } else if (currentSite.type === cardTypes.SPECIAL) {
                // If current site is jail
                if (currentSite.id === 10) {
                    debitPlayerMoney(id, 100);
                    setIsDone(true);
                } else if (currentSite.id === 30) {
                    movePlayer(id, 10, directions.BACKWARD)                    
                }else{
                    setIsDone(true)
                }
            } else if (currentSite.type === cardTypes.TAX) {
                debitPlayerMoney(id, currentSite.debit)
                setIsDone(true)
            } else {    
                setIsDone(true)
            }
            // Check if user crossed start(siteId === 0), if YES then add $200 credit 
            if(ps <= 39 && cs >= 0 && ps > cs && currentPlayer.current.direction === directions.FORWARD ) creditPlayerMoney(id, 200)
        } else if(firstRender.current === true){
            firstRender.current = false
        }
    }, [setIsDone, id, setShowModal, debitPlayerMoney, movePlayer, creditPlayerMoney, diceSum, noOfCardsInCategory])

    // To move player when there are multple turns
    const setPlayerPositionRecursive = useCallback(async (turningPoints) => {
        if (turningPoints.length === 0) {
            setPlayerPosition(currentPlayer.current.site, isMounted.current)
            await delay(400)
            setIsMoving(id, false)
            return;
        }
        setPlayerPosition(turningPoints[0], isMounted.current)
        await delay(400)
        turningPoints.shift()
        setPlayerPositionRecursive(turningPoints)

        // setPlayerPositionRecursiveHelper(turningPoints, {...positions.current[currentPlayer.current.site]}, playersDataRef.current.players, playersDataRef.current.totalPlayers, id, playerRef.current, playerMoveAudio, isMounted.current, setIsMoving)
    }, [setIsMoving, id, playerMoveAudio])

    // To move player
    useEffect(() => {
        if(isMoving || isMounted.current === false){
            currentPlayer.current = playersDataRef.current.players[id]
            // Called on mount || first render
            if (!isMounted.current || playersDataRef.current.activePlayer !== id) {
                setPlayerPosition(currentPlayer.current.site, isMounted.current)
                isMounted.current = true;
                console.log("useEffect1 onMount ID:" + id)
            }
            // Called every on time on player move
            else if (playersDataRef.current.activePlayer === id) {
                let turningPoints = getAllTurningPoints(currentPlayer.current.previousSite, currentPlayer.current.site, currentPlayer.current.direction);
                setPlayerPositionRecursive(turningPoints)            
                console.log("useEffect1 onUpdate ID:" + id)
            }
        }
    }, [isMoving, currentPlayerSite, playerMoveAudio, id, setPlayerPosition, setIsDone, setPlayerPositionRecursive, setIsMoving])


    useEffect(() => {
        if (isMounted.current && isMoving === false) {
            showAppropriateModalOrDoAppropriateAction()
        }
    }, [isMoving, showAppropriateModalOrDoAppropriateAction])


    // To update playersDataRef and siteDateRef
    useEffect(() => {
        siteDataRef.current = siteData
        playersDataRef.current = playersData
    }, [playersData, siteData])



    return (
        <div className={`${style.player} player-${color}`} ref={playerRef}>
            {id}
        </div>
    );

}
const mapStateToProps = (store) => {
    return {
        playersData: store.playersData,
        diceSum: store.dice.diceSum,
        setDiceSumCalledCount: store.dice.setDiceSumCalledCount,
        board: store.board,
        siteData: store.siteData,
        noOfCardsInCategory: store.siteData.noOfCardsInCategory,
    }
}

const mapDispatchToProps = (dispatch) => {
    return {
        movePlayer: (playerId, currentSite, direction) => dispatch(movePlayer(playerId, currentSite, direction)),
        setShowModal: (showModal, currentModal) => dispatch(setShowModal(showModal, currentModal)),
        setIsDone: (isDone) => dispatch(setIsDone(isDone)),
        debitPlayerMoney: (playerId, amount) => dispatch(debitPlayerMoney(playerId, amount)),
        creditPlayerMoney: (playerId, amount) => dispatch(creditPlayerMoney(playerId, amount)),
        setIsMoving: (playerId, isMoving) => dispatch(setIsMoving(playerId, isMoving)),
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(Player)