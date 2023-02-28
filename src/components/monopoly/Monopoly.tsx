import {
  BOARD_DATA,
  initBoard,
  setSites,
  setTotalPlayers,
} from '@monopoly/lib//core';
import { useEffect, useRef } from 'react';
import useAppDispatch from 'src/hooks/redux/use-app-dispatch';
import useAppSelector from 'src/hooks/redux/use-app-selector';
import style from '../../assets/css/monopoly.module.scss';
import Footer from '../home/footer/Footer';
import Header from '../home/header/Header';
import Board from './board/Board';
import ModalWrapper from './modal/ModalWrapper';

const Monopoly = () => {
  const totalPlayers = 4;
  const isMounted = useRef(false);
  const dispatch = useAppDispatch();
  const isDone = useAppSelector((state) => state.board.isDone);

  useEffect(() => {
    if (!isMounted.current) {
      dispatch(initBoard(600));
      dispatch(setTotalPlayers(totalPlayers));
      dispatch(setSites([...BOARD_DATA]));
      isMounted.current = true;
    }
  }, [dispatch, isDone]);

  return (
    <div className={style.monopoly}>
      {isMounted.current && (
        <>
          <Header />
          <Board />
          <ModalWrapper />
          <Footer />
        </>
      )}
    </div>
  );
};

export default Monopoly;
