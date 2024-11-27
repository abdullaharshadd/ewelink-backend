var data = null;
var accessInfo = null;

export const setAccessInfo = (sai) => {
    accessInfo = sai;
}

export const setData = (d) => {
    data = d;
}

export const getData = () => {
    return data;
}

export const getAccessInfo = () => {
    return accessInfo;
}

