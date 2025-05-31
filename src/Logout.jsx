import React, { useEffect } from 'react';
// import { Header } from './Header';
import { useNavigate } from 'react-router';

const Logout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Clear data
    localStorage.removeItem('userData');

    // Redirect after 1 second
    const timeout = setTimeout(() => {
      navigate('/');
    }, 1000); // 1 second

    return () => clearTimeout(timeout);
  }, [navigate]);

  return (
    <div>
      {/* <Header /> */}
      <p>Logging out...</p>
    </div>
  );
};

export default Logout;


// const  = () => {
//   const navigate = useNavigate(); // used to redirect after logout

  // useEffect(() => {
    // Clear the stored user data
    // localStorage.removeItem('userData');

    // Optionally redirect to home or login page after logout
//     navigate('/');
//   }, [navigate]);

//   return (
//     <div>
//       <Header />
//       <p>Logging out...</p>
//     </div>
//   );
// };